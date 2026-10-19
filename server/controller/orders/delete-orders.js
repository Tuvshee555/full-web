// controller/orders/delete-orders.js
import { prisma } from "../../prismaClient.js";
import { restockOrder } from "../../utils/stock.js";
import { invalidateCatalog } from "../../utils/cache.js";

export const deleteFoodOrder = async (req, res) => {
  const { id } = req.body ?? {};

  if (!id) {
    return res.status(400).json({ message: "Order ID is required" });
  }

  try {
    // 🔒 ADMIN ONLY
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const order = await prisma.foodOrder.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // 🔒 NEVER DELETE IMPORTANT ORDERS
    if (["PAID", "DELIVERING", "DELIVERED"].includes(order.status)) {
      return res.status(400).json({
        message: "Paid or fulfilled orders must be retained for accounting.",
      });
    }

    const deleted = await prisma.$transaction(async (tx) => {
      const claimed = await tx.foodOrder.updateMany({
        where: { id, status: order.status },
        data: { updatedAt: new Date() },
      });
      if (claimed.count !== 1) return false;
      // A payable QR may still receive funds later. Retain its order and
      // payment mapping so callbacks and reconciliation cannot be orphaned.
      const [payment, lemonPayment] = await Promise.all([
        tx.payment.findUnique({ where: { orderId: id }, select: { id: true } }),
        tx.lemonPayment.findUnique({ where: { orderId: id }, select: { id: true } }),
      ]);
      if (payment || lemonPayment) {
        const err = new Error("Orders with payment history must be retained. Cancel the order instead.");
        err.code = "PAYMENT_HISTORY";
        throw err;
      }
      if (order.status !== "CANCELLED") await restockOrder(id, tx);
      await tx.orderItem.deleteMany({ where: { orderId: id } });
      await tx.foodOrder.delete({ where: { id } });
      return true;
    });
    if (!deleted) return res.status(409).json({ message: "This order changed. Refresh and try again." });
    invalidateCatalog();

    return res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    if (error?.code === "PAYMENT_HISTORY") return res.status(409).json({ message: error.message });
    console.error("DELETE ORDER ERROR:", error);
    return res.status(500).json({ message: "Failed to delete order" });
  }
};
