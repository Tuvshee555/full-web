import { prisma } from "../prismaClient.js";
import { restockOrder } from "../utils/stock.js";

import { PAYMENT_WINDOW_MS } from "../utils/orderPaid.js";
import { invalidateCatalog } from "../utils/cache.js";

export async function expireUnpaidOrders(client = prisma) {
  let expired = 0;
  try {
    const cutoff = new Date(
      Date.now() - PAYMENT_WINDOW_MS
    );

    // Find the orders first so we can release the stock they reserved.
    const expiring = await client.foodOrder.findMany({
      where: {
        status: "WAITING_PAYMENT",
        createdAt: { lt: cutoff },
      },
      select: { id: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: 100,
    });

    for (const { id } of expiring) {
      try {
        const changed = await client.$transaction(async (tx) => {
          const result = await tx.foodOrder.updateMany({
            where: { id, status: "WAITING_PAYMENT", createdAt: { lt: cutoff } },
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
