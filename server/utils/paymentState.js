/**
 * Payment and fulfillment are separate. COD is collected on delivery; bank
 * transfers are confirmed by the existing admin PAID transition. Provider
 * receipts retain evidence of money received even after an order is cancelled.
 */
export function paymentState(order, payment = null) {
  const lemon = order.lemonPayments ?? [];
  if (order.paymentMethod === "LEMON" && lemon.some((entry) => entry.status === "REFUNDED")) return "REFUNDED";
  const receiptPaid = order.paymentMethod === "QPAY"
    ? payment?.status === "PAID"
    : order.paymentMethod === "LEMON" && lemon.some((entry) => entry.status === "PAID");
  if (order.status === "CANCELLED") return receiptPaid ? "REVIEW" : "UNPAID";
  if (receiptPaid) return "PAID";
  if (order.paymentMethod === "COD") return order.status === "DELIVERED" ? "PAID" : "UNPAID";
  return ["PAID", "DELIVERING", "DELIVERED"].includes(order.status) ? "PAID" : "UNPAID";
}
