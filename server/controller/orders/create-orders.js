// controller/orders/create-orders.js
import { prisma } from "../../prismaClient.js";
import { generateOrderNumber } from "../../utils/generateOrderNumber.js";

import { sendTelegramMessage, formatOrderMessage } from "../../utils/telegram.js";
import { notifyCustomer } from "../../utils/orderNotify.js";
import { applyStockDecrements } from "../../utils/stock.js";
import { background } from "../../utils/background.js";
import { deliveryFee as currentDeliveryFee } from "../../utils/deliveryFee.js";
import { invalidateCatalog } from "../../utils/cache.js";

// Delivery fee is the server-side source of truth (must match the customer UI).
const DELIVERY_ZONES = new Set(["UB", "RURAL"]);

export const createOrder = async (req, res) => {
  try {
    const userId = req.user?.id;

    const {
      totalPrice,
      paymentMethod,
      deliveryZone,
      idempotencyKey,
      firstName,
      lastName,
      phone,
      city,
      district,
      khoroo,
      address,
      notes,
    } = req.body ?? {};

    const items = req.body?.items ?? req.body?.normalizedItems;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // Shape the client-facing order response in one place so the idempotent
    // replay path and the freshly-created path return the exact same thing.
    const toOrderResponse = (o) => ({
      orderId: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      paymentMethod: o.paymentMethod,
      totalPrice: o.totalPrice,
      deliveryFee: o.deliveryFee,
      deliveryZone: o.deliveryZone,
    });

    const safeKey =
      typeof idempotencyKey === "string" && idempotencyKey.trim().length
        ? idempotencyKey.trim()
        : null;
    if (safeKey?.length > 100) return res.status(400).json({ message: "Invalid checkout key" });

    // Idempotency: if this key already produced an order for this user, return
    // it instead of creating a duplicate (double-click / retry / flaky network).
    if (safeKey) {
      const existing = await prisma.order.findUnique({
        where: { idempotencyKey: safeKey },
        select: {
          id: true,
          userId: true,
          orderNumber: true,
          status: true,
          paymentMethod: true,
          totalPrice: true,
          deliveryFee: true,
          deliveryZone: true,
        },
      });
      if (existing && existing.userId === userId) {
        return res.status(200).json(toOrderResponse(existing));
      }
      if (existing) return res.status(409).json({ message: "This checkout key is already in use. Start a new checkout." });
    }

    // No card payments: QPay, bank transfer, or cash on delivery only.
    if (!paymentMethod || !["COD", "BANK", "QPAY"].includes(paymentMethod)) {
      return res.status(400).json({ message: "Invalid payment method" });
    }

    if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
      return res.status(400).json({ message: "Provide between 1 and 100 order items" });
    }

    const safe = (v) =>
      typeof v === "string" && v.trim().length ? v.trim() : null;

    const deliveryFields = { firstName, lastName, phone, city, district, khoroo, address, notes };
    for (const [field, value] of Object.entries(deliveryFields)) {
      const maxLength = field === "notes" ? 2000 : field === "address" ? 1000 : 120;
      if (value != null && (typeof value !== "string" || value.length > maxLength)) {
        return res.status(400).json({ message: `Invalid ${field}` });
      }
      if (field !== "notes" && !safe(value)) {
        return res.status(400).json({ message: `Delivery ${field} is required` });
      }
    }
    if (!/^\+?[\d\s()-]{8,20}$/.test(phone) || phone.replace(/\D/g, "").length < 8) {
      return res.status(400).json({ message: "A valid delivery phone number is required" });
    }

    const combinedItems = new Map();
    for (const item of items) {
      const rawQuantity = item?.quantity;
      const quantity = (typeof rawQuantity === "number" || typeof rawQuantity === "string")
        ? Number(rawQuantity) : NaN;
      const productId = typeof item?.productId === "string" ? item.productId.trim() : "";
      const rawSize = item?.size ?? item?.selectedSize;
      if (!productId || productId.length > 100 || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 999 ||
          (rawSize != null && (typeof rawSize !== "string" || rawSize.length > 60))) {
        return res.status(400).json({ message: "Every item needs a valid product, size and quantity between 1 and 999" });
      }
      const size = safe(rawSize);
      const key = JSON.stringify([productId, size]);
      const previous = combinedItems.get(key);
      const totalQuantity = quantity + (previous?.quantity || 0);
      if (totalQuantity > 999) return res.status(400).json({ message: "Maximum quantity is 999 per product size" });
      combinedItems.set(key, { productId, size, quantity: totalQuantity });
    }
    const normalizedItems = [...combinedItems.values()];

    const productIds = [...new Set(normalizedItems.map((i) => i.productId))];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, price: true, sizes: { select: { label: true, price: true } } },
    });

    if (products.length !== productIds.length) {
      return res.status(400).json({ message: "Some products no longer exist" });
    }

    // One unit's price: the chosen size's own price, otherwise the product price.
    // Computed here (never trusted from the client) and stored on the order line.
    const productById = new Map(products.map((product) => [product.id, product]));
    const unitPriceOf = (item) => {
      const product = productById.get(item.productId);
      const size = item.size ? (product?.sizes ?? []).find((s) => s.label === item.size) : null;
      const own = Number(size?.price);
      return size && size.price != null && Number.isFinite(own) && own > 0 ? own : Number(product?.price ?? 0);
    };
    const pricedItems = normalizedItems.map((item) => ({ ...item, unitPrice: unitPriceOf(item) }));

    const itemsSubtotal = Number(
      pricedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0).toFixed(2)
    );

    if (!Number.isFinite(itemsSubtotal) || itemsSubtotal <= 0) {
      return res.status(400).json({ message: "Order total must be greater than zero" });
    }

    // Normalize the delivery zone and derive the fee server-side.
    if (deliveryZone != null && !DELIVERY_ZONES.has(deliveryZone)) {
      return res.status(400).json({ message: "Invalid delivery zone" });
    }
    const normalizedZone = deliveryZone || "UB";
    const deliveryFee = currentDeliveryFee();

    // Grand total the customer is actually charged (items + delivery).
    const computedTotalPrice = Number((itemsSubtotal + deliveryFee).toFixed(2));

    const requestedTotalPrice = Number(totalPrice);
    const hasRequestedTotal = totalPrice !== undefined && totalPrice !== null && totalPrice !== "";
    if (hasRequestedTotal && (!Number.isFinite(requestedTotalPrice) || !["number", "string"].includes(typeof totalPrice))) {
      return res.status(400).json({ message: "Invalid order total" });
    }
    if (
      hasRequestedTotal &&
      Math.abs(requestedTotalPrice - computedTotalPrice) > 0.01
    ) {
      // A saved cart can outlive a price or delivery-fee change. Do not create
      // an order for a different amount than the shopper just approved.
      return res.status(409).json({
        code: "PRICE_CHANGED",
        message: "Prices or delivery charges changed. Review the updated total and submit again.",
        totalPrice: computedTotalPrice,
        deliveryFee,
        items: pricedItems.map(({ productId, size, unitPrice }) => ({ productId, size, unitPrice })),
      });
    }

    const status =
      paymentMethod === "COD" ? "COD_PENDING" : "WAITING_PAYMENT";

    const orderNumber = generateOrderNumber();

    const orderSelect = {
      id: true,
      orderNumber: true,
      status: true,
      paymentMethod: true,
      totalPrice: true,
      deliveryFee: true,
      deliveryZone: true,
      userId: true,
    };

    let order;
    try {
      // Reserve stock and create the order atomically: if any tracked size is
      // short, the whole thing rolls back and no order (or reservation) sticks.
      order = await prisma.$transaction(async (tx) => {
        await applyStockDecrements(tx, pricedItems);

        return tx.order.create({
          data: {
            userId,
            orderNumber,
            idempotencyKey: safeKey,
            totalPrice: computedTotalPrice,
            deliveryFee,
            deliveryZone: normalizedZone,
            paymentMethod,
            status,

            firstName: safe(firstName),
            lastName: safe(lastName),
            phone: safe(phone),
            city: safe(city),
            district: safe(district),
            khoroo: safe(khoroo),
            address: safe(address),
            notes: safe(notes),

            orderItems: {
              create: pricedItems,
            },
          },
          select: orderSelect,
        });
      }, { maxWait: 5000, timeout: 15000 });
    } catch (createErr) {
      if (createErr?.code === "INVALID_SIZE") return res.status(400).json({ message: "Please select a valid product size." });
      if (createErr?.code === "INVALID_QUANTITY") return res.status(400).json({ message: "Invalid item quantity" });
      // Not enough stock for a chosen size.
      if (createErr?.code === "OUT_OF_STOCK") {
        return res.status(409).json({
          message: "Sorry, an item just went out of stock. Please adjust your cart.",
          size: createErr.size,
          productId: createErr.productId,
        });
      }

      // Unique idempotency-key race: a concurrent request already created it.
      if (createErr?.code === "P2002" && safeKey) {
        const existing = await prisma.order.findUnique({
          where: { idempotencyKey: safeKey },
          select: orderSelect,
        });
        if (existing && existing.userId === userId) {
          return res.status(200).json(toOrderResponse(existing));
        }
        if (existing) return res.status(409).json({ message: "This checkout key is already in use. Start a new checkout." });
      }
      throw createErr;
    }

    invalidateCatalog();
    res.status(201).json(toOrderResponse(order));

    background((async () => {
      try {
        const fullOrder = await prisma.order.findUnique({
          where: { id: order.id },
          include: {
            user: { select: { email: true } },
            orderItems: {
              include: { product: true },
            },
          },
        });

        if (!fullOrder) return;

        const alerts = [sendTelegramMessage(formatOrderMessage(fullOrder)).catch(() => {})];

        alerts.push(notifyCustomer(order.id, "created"));
        await Promise.all(alerts);
      } catch (bgErr) {
        console.error("Background notify failed:", bgErr);
      }
    })());
  } catch (err) {
    console.error("CREATE ORDER ERROR:", err);
    return res.status(500).json({ message: "Order creation failed" });
  }
};
