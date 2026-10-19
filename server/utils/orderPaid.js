import { prisma } from "../prismaClient.js";
import { invalidateCatalog } from "./cache.js";

export const PAYMENT_WINDOW_MS = 15 * 60 * 1000;
const PAYABLE_STATUSES = ["PENDING", "WAITING_PAYMENT"];

/** Called only by the transaction that won the first transition to PAID. */
export async function incrementSalesForOrder(orderId, tx) {
  if (!tx) throw new Error("Sales accounting requires an order transaction");
  const items = await tx.orderItem.findMany({
    where: { orderId },
    select: { productId: true, quantity: true },
  });

  const quantities = new Map();
  for (const item of items) {
    quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.quantity);
  }
  for (const [productId, quantity] of [...quantities].sort(([a], [b]) => a.localeCompare(b))) {
    await tx.product.update({
      where: { id: productId },
      data: { salesCount: { increment: quantity } },
    });
  }
}

/**
 * Provider verification happens first. Atomically claim the transition so a
 * webhook, customer poll and expiry cannot all win. Accounting commits with it.
 * Late money is retained for resolution; never revive released reservations.
 */
export async function confirmPaidOrder({ orderId, invoiceId }, client = prisma) {
  const result = await client.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: { id: orderId, paymentMethod: "QPAY", status: { in: PAYABLE_STATUSES } },
      data: { status: "PAID" },
    });
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) return { order: null, changed: false, requiresReview: true };
    await tx.payment.updateMany({
      where: { orderId, invoiceId },
      data: { status: "PAID" },
    });
    if (claimed.count === 1) await incrementSalesForOrder(orderId, tx);
    return {
      order,
      changed: claimed.count === 1,
      requiresReview: order.status === "CANCELLED" || order.paymentMethod !== "QPAY",
    };
  });
  if (result.changed) invalidateCatalog();
  return result;
}
