// Cancels unpaid orders whose stock reservation has ended and returns their stock, exactly once.
//
// Every order created since 2026-11-02 carries its own deadline (`expiresAt`: a chat order's
// owner-set window, QPay 15 minutes, bank transfer 24 hours). Older rows have no deadline and
// fall back to their payment method's window. Each order is claimed in its own transaction with
// a compare-and-set on the status, so two overlapping runs (a request-triggered sweep and the
// cron) can never restock the same order twice.
//
// Triggers: `runDueJobs()` on API traffic (at most once a minute per warm instance), the chat
// assistant's own order creation (inline, for the customer's phone), a stock shortfall at
// checkout (inline retry), and the secured cron endpoint /api/jobs/expire-orders.
import { prisma } from "../prismaClient.js";
import { restockOrder } from "../utils/stock.js";
import { paymentWindowMs } from "../utils/orderPaid.js";
import { invalidateCatalog } from "../utils/cache.js";
import { recordAudit } from "../utils/audit.js";

// Each payment method has its own default deadline (QPay 15 minutes, bank transfer 24 hours).
const EXPIRING_METHODS = ["QPAY", "BANK"];

/**
 * The queries that find due reservations as of `now`, each with the claim condition that proves
 * the row is still due when it is cancelled: an explicit deadline that passed, or (rows created
 * before deadlines existed) the payment method's window since creation.
 */
export function dueOrderQueries(now = new Date(), { phone, source } = {}) {
  const scope = { status: "WAITING_PAYMENT", ...(phone ? { phone } : {}), ...(source ? { source } : {}) };
  return [
    { kind: "deadline", where: { ...scope, paymentMethod: { in: EXPIRING_METHODS }, expiresAt: { lt: now } }, claim: { status: "WAITING_PAYMENT", expiresAt: { lt: now } } },
    ...EXPIRING_METHODS.map((paymentMethod) => {
      const cutoff = new Date(now.getTime() - paymentWindowMs(paymentMethod));
      return { kind: "legacy", where: { ...scope, paymentMethod, createdAt: { lt: cutoff } }, claim: { status: "WAITING_PAYMENT", paymentMethod, createdAt: { lt: cutoff } } };
    }),
  ];
}

/** Runs `fn` inside a transaction on a full client, or directly when `client` already is one. */
export const withTransaction = (client, fn, options) =>
  typeof client.$transaction === "function" ? client.$transaction(fn, options) : fn(client);

/**
 * Expires every due order (up to `limit`) and returns how many were cancelled.
 * Options: `phone` / `source` narrow the sweep (used inline before a chat order), `trigger`
 * names the caller for the JobRun record, `record: false` skips the record (inline sweeps).
 * @param {*} client Prisma client or interactive transaction client
 * @param {{ phone?: string, source?: string, limit?: number, trigger?: string, record?: boolean }} [options]
 */
export async function expireUnpaidOrders(client = prisma, { phone, source, limit = 100, trigger = "request", record = trigger !== "inline" } = {}) {
  const now = new Date();
  const take = Math.max(1, Math.min(1000, limit));
  let expired = 0;
  let failure = null;
  try {
    const seen = new Set();
    for (const query of dueOrderQueries(now, { phone, source })) {
      const rows = await client.order.findMany({ where: query.where, select: { id: true, expiresAt: true }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], take });
      for (const row of rows) {
        // A row with its own deadline is handled by the deadline query alone; the legacy window is for rows without one.
        if (query.kind === "legacy" && row.expiresAt != null) continue;
        if (seen.has(row.id) || seen.size >= take) continue;
        seen.add(row.id);
        try {
          const changed = await withTransaction(client, async (tx) => {
            // Claim the transition first: a second runner finds count 0 and restocks nothing.
            const result = await tx.order.updateMany({ where: { id: row.id, ...query.claim }, data: { status: "CANCELLED", expiredAt: now } });
            if (result.count !== 1) return false;
            await restockOrder(row.id, tx);
            return true;
          });
          if (changed) expired += 1;
        } catch (err) {
          failure = failure || err;
          console.error("Order expiry rolled back:", row.id, err?.message);
        }
      }
    }
    if (expired > 0) {
      invalidateCatalog();
      console.log(`Expired ${expired} unpaid orders and released their stock`);
      if (trigger !== "inline") recordAudit({ actor: trigger === "cron" || trigger === "manual" ? trigger : "system", action: "orders_expired", details: { count: expired, trigger, ...(phone ? { scoped: "phone" } : {}) } });
    }
  } catch (err) {
    failure = err;
    console.error("❌ Expire job failed:", err.message);
  }
  // Keep a record of cron and manual runs, and of any request-triggered run that did something or failed.
  if (record && client.jobRun && (trigger !== "request" || expired > 0 || failure)) {
    await client.jobRun.create({ data: { name: "expire-orders", trigger, startedAt: now, finishedAt: new Date(), ok: !failure, processed: expired, error: failure ? String(failure?.message || failure).slice(0, 500) : null } }).catch(() => undefined);
  }
  return expired;
}
