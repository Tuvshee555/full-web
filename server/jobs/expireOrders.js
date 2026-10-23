import { prisma } from "../prismaClient.js";
import { restockOrder } from "../utils/stock.js";
import { paymentWindowMs } from "../utils/orderPaid.js";
import { invalidateCatalog } from "../utils/cache.js";

// Each payment method has its own deadline (QPay 15 minutes, bank transfer 24 hours).
const EXPIRING_METHODS = ["QPAY", "BANK"];

export async function expireUnpaidOrders(client = prisma) {
  let expired = 0;
  try {
    for (const paymentMethod of EXPIRING_METHODS) {
      const cutoff = new Date(Date.now() - paymentWindowMs(paymentMethod));

      // Find the orders first so we can release the stock they reserved.
      const expiring = await client.order.findMany({
        where: {
          status: "WAITING_PAYMENT",
          paymentMethod,
          createdAt: { lt: cutoff },
        },
        select: { id: true },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: 100,
      });

      for (const { id } of expiring) {
        try {
          const changed = await client.$transaction(async (tx) => {
            const result = await tx.order.updateMany({
              where: { id, status: "WAITING_PAYMENT", paymentMethod, createdAt: { lt: cutoff } },
              data: { status: "CANCELLED" },
            });
            if (result.count !== 1) return false;
            await restockOrder(id, tx);
            return true;
          });
          if (changed) {
            expired += 1;
            invalidateCatalog();
          }
        } catch (err) {
          console.error("Order expiry rolled back:", id, err?.message);
        }
      }
    }

    if (expired > 0) {
      console.log(
        `Expired ${expired} unpaid orders and released their stock`
      );
    }
  } catch (err) {
    console.error("❌ Expire job failed:", err.message);
  }
  return expired;
}
