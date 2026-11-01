// The one place an order is created: the checkout API (controller/orders/create-orders.js) and
// the chat assistant (src/chatbot/commerce/placeOrder.ts) both call placeOrder(), so pricing,
// the delivery fee, stock reservation, idempotency and alerts behave the same whichever way a
// customer orders. Field validation stays in each caller; this module validates what it computes.
import { prisma } from "../prismaClient.js";
import { generateOrderNumber } from "../utils/generateOrderNumber.js";
import { sendTelegramMessage, formatOrderMessage } from "../utils/telegram.js";
import { notifyCustomer } from "../utils/orderNotify.js";
import { applyStockDecrements } from "../utils/stock.js";
import { background } from "../utils/background.js";
import { deliveryFee as currentDeliveryFee } from "../utils/deliveryFee.js";
import { invalidateCatalog } from "../utils/cache.js";

export const DELIVERY_ZONES = new Set(["UB", "RURAL"]);
export const PAYMENT_METHODS = new Set(["COD", "BANK", "QPAY"]);

export class OrderError extends Error {
  constructor(code, status, message, extra = {}) {
    super(message);
    this.code = code;
    this.status = status;
    this.extra = extra;
  }
}

const ORDER_SELECT = { id: true, orderNumber: true, status: true, paymentMethod: true, totalPrice: true, deliveryFee: true, deliveryZone: true, userId: true };
const safe = (value) => (typeof value === "string" && value.trim().length ? value.trim() : null);

/** Shape the client-facing order response in one place. */
export const toOrderResponse = (order) => ({
  orderId: order.id, orderNumber: order.orderNumber, status: order.status, paymentMethod: order.paymentMethod,
  totalPrice: order.totalPrice, deliveryFee: order.deliveryFee, deliveryZone: order.deliveryZone,
});

/**
 * Creates an order for `userId` from already-validated items ({ productId, size, quantity }).
 * Prices come from the catalogue, the delivery fee from the server, stock is reserved in the same
 * transaction, and a repeated idempotency key returns the first order instead of a duplicate.
 * Throws OrderError (code, HTTP status, message) on every refusal.
 */
export async function placeOrder(input, { client = prisma } = {}) {
  const { userId, items, paymentMethod, deliveryZone, idempotencyKey, totalPrice, firstName, lastName, phone, city, district, khoroo, address, notes } = input;
  if (!userId) throw new OrderError("UNAUTHORIZED", 401, "Unauthorized");
  const safeKey = typeof idempotencyKey === "string" && idempotencyKey.trim().length ? idempotencyKey.trim() : null;
  if (safeKey?.length > 100) throw new OrderError("INVALID_KEY", 400, "Invalid checkout key");

  if (safeKey) {
    const existing = await client.order.findUnique({ where: { idempotencyKey: safeKey }, select: ORDER_SELECT });
    if (existing && existing.userId === userId) return { order: existing, replayed: true };
    if (existing) throw new OrderError("KEY_IN_USE", 409, "This checkout key is already in use. Start a new checkout.");
  }
  if (!paymentMethod || !PAYMENT_METHODS.has(paymentMethod)) throw new OrderError("INVALID_PAYMENT_METHOD", 400, "Invalid payment method");
  if (!Array.isArray(items) || items.length === 0 || items.length > 100) throw new OrderError("INVALID_ITEMS", 400, "Provide between 1 and 100 order items");

  const combinedItems = new Map();
  for (const item of items) {
    const rawQuantity = item?.quantity;
    const quantity = (typeof rawQuantity === "number" || typeof rawQuantity === "string") ? Number(rawQuantity) : NaN;
    const productId = typeof item?.productId === "string" ? item.productId.trim() : "";
    const rawSize = item?.size ?? item?.selectedSize;
    if (!productId || productId.length > 100 || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 999 ||
        (rawSize != null && (typeof rawSize !== "string" || rawSize.length > 60))) {
      throw new OrderError("INVALID_ITEM", 400, "Every item needs a valid product, size and quantity between 1 and 999");
    }
    const size = safe(rawSize);
    const key = JSON.stringify([productId, size]);
    const previous = combinedItems.get(key);
    const totalQuantity = quantity + (previous?.quantity || 0);
    if (totalQuantity > 999) throw new OrderError("QUANTITY_TOO_LARGE", 400, "Maximum quantity is 999 per product size");
    combinedItems.set(key, { productId, size, quantity: totalQuantity });
  }
  const normalizedItems = [...combinedItems.values()];
  const productIds = [...new Set(normalizedItems.map((item) => item.productId))];
  const products = await client.product.findMany({ where: { id: { in: productIds } }, select: { id: true, price: true, sizes: { select: { label: true, price: true } } } });
  if (products.length !== productIds.length) throw new OrderError("PRODUCT_MISSING", 400, "Some products no longer exist");

  // One unit's price: the chosen size's own price, otherwise the product price. Never trusted from the client.
  const productById = new Map(products.map((product) => [product.id, product]));
  const unitPriceOf = (item) => {
    const product = productById.get(item.productId);
    const size = item.size ? (product?.sizes ?? []).find((s) => s.label === item.size) : null;
    const own = Number(size?.price);
    return size && size.price != null && Number.isFinite(own) && own > 0 ? own : Number(product?.price ?? 0);
  };
  const pricedItems = normalizedItems.map((item) => ({ ...item, unitPrice: unitPriceOf(item) }));
  const itemsSubtotal = Number(pricedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0).toFixed(2));
  if (!Number.isFinite(itemsSubtotal) || itemsSubtotal <= 0) throw new OrderError("ZERO_TOTAL", 400, "Order total must be greater than zero");

  if (deliveryZone != null && !DELIVERY_ZONES.has(deliveryZone)) throw new OrderError("INVALID_ZONE", 400, "Invalid delivery zone");
  const normalizedZone = deliveryZone || "UB";
  const deliveryFee = currentDeliveryFee();
  const computedTotalPrice = Number((itemsSubtotal + deliveryFee).toFixed(2));

  const requestedTotalPrice = Number(totalPrice);
  const hasRequestedTotal = totalPrice !== undefined && totalPrice !== null && totalPrice !== "";
  if (hasRequestedTotal && (!Number.isFinite(requestedTotalPrice) || !["number", "string"].includes(typeof totalPrice))) throw new OrderError("INVALID_TOTAL", 400, "Invalid order total");
  if (hasRequestedTotal && Math.abs(requestedTotalPrice - computedTotalPrice) > 0.01) {
    // A saved cart can outlive a price or delivery-fee change. Never charge a different amount than approved.
    throw new OrderError("PRICE_CHANGED", 409, "Prices or delivery charges changed. Review the updated total and submit again.", {
      totalPrice: computedTotalPrice, deliveryFee, items: pricedItems.map(({ productId, size, unitPrice }) => ({ productId, size, unitPrice })),
    });
  }

  const status = paymentMethod === "COD" ? "COD_PENDING" : "WAITING_PAYMENT";
  const orderNumber = generateOrderNumber();
  let order;
  try {
    // Reserve stock and create the order atomically: a short size rolls everything back.
    order = await client.$transaction(async (tx) => {
      await applyStockDecrements(tx, pricedItems);
      return tx.order.create({
        data: {
          userId, orderNumber, idempotencyKey: safeKey, totalPrice: computedTotalPrice, deliveryFee, deliveryZone: normalizedZone, paymentMethod, status,
          firstName: safe(firstName), lastName: safe(lastName), phone: safe(phone), city: safe(city), district: safe(district), khoroo: safe(khoroo), address: safe(address), notes: safe(notes),
          orderItems: { create: pricedItems },
        },
        select: ORDER_SELECT,
      });
    }, { maxWait: 5000, timeout: 15000 });
  } catch (createErr) {
    if (createErr?.code === "INVALID_SIZE") throw new OrderError("INVALID_SIZE", 400, "Please select a valid product size.");
    if (createErr?.code === "INVALID_QUANTITY") throw new OrderError("INVALID_QUANTITY", 400, "Invalid item quantity");
    if (createErr?.code === "OUT_OF_STOCK") throw new OrderError("OUT_OF_STOCK", 409, "Sorry, an item just went out of stock. Please adjust your cart.", { size: createErr.size, productId: createErr.productId });
    if (createErr?.code === "P2002" && safeKey) {
      const existing = await client.order.findUnique({ where: { idempotencyKey: safeKey }, select: ORDER_SELECT });
      if (existing && existing.userId === userId) return { order: existing, replayed: true };
      if (existing) throw new OrderError("KEY_IN_USE", 409, "This checkout key is already in use. Start a new checkout.");
    }
    throw createErr;
  }
  invalidateCatalog();
  return { order, replayed: false };
}

/** Owner alert and customer email for a new order; runs after the response and never throws. */
export function notifyNewOrder(orderId, { client = prisma } = {}) {
  background((async () => {
    try {
      const fullOrder = await client.order.findUnique({ where: { id: orderId }, include: { user: { select: { email: true } }, orderItems: { include: { product: true } } } });
      if (!fullOrder) return;
      await Promise.all([sendTelegramMessage(formatOrderMessage(fullOrder)).catch(() => {}), notifyCustomer(orderId, "created")]);
    } catch (bgErr) {
      console.error("Background notify failed:", bgErr);
    }
  })());
}
