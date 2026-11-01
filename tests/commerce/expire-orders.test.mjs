import test from "node:test";
import assert from "node:assert/strict";

// The expiry job and the order service with an in-memory Prisma double: no database, no network.
process.env.DATABASE_URL ||= "postgresql://service-tests.invalid/no-network";
process.env.DELIVERY_FEE = "9000";
const db = {};
globalThis.prisma = db;
const { dueOrderQueries, expireUnpaidOrders } = await import("../../server/jobs/expireOrders.js");
const { placeOrder, reservationDeadline } = await import("../../server/services/placeOrder.js");
const { cronAuthorized } = await import("../../src/pages/api/jobs/expire-orders.ts");

const HOUR = 3_600_000;
/** A tiny Prisma stand-in that understands the where-clauses the job and the service use. */
function freshDb({ orders = [], sizes = [] } = {}) {
  const items = [];
  const jobRuns = [];
  const matches = (row, where) => Object.entries(where).every(([key, value]) => {
    if (key === "OR") return value.some((option) => matches(row, option));
    if (key === "in") return value.includes(row);
    if (value && typeof value === "object" && !(value instanceof Date)) {
      if ("in" in value) return value.in.includes(row[key]);
      if ("lt" in value) return row[key] != null && row[key] < value.lt;
      if ("gt" in value) return row[key] != null && row[key] > value.gt;
      if ("not" in value) return row[key] !== value.not;
    }
    return row[key] === value;
  });
  Object.assign(db, {
    order: {
      findMany: async ({ where, take }) => orders.filter((row) => matches(row, where)).slice(0, take ?? 1000),
      findUnique: async ({ where }) => orders.find((row) => row.idempotencyKey === where.idempotencyKey) || null,
      updateMany: async ({ where, data }) => { const hit = orders.filter((row) => matches(row, where)); for (const row of hit) Object.assign(row, data); return { count: hit.length }; },
      create: async ({ data }) => { const row = { id: `o${orders.length + 1}`, ...data }; orders.push(row); for (const item of data.orderItems.create) items.push({ orderId: row.id, ...item }); return row; },
      count: async ({ where }) => orders.filter((row) => matches(row, where)).length,
    },
    orderItem: { findMany: async ({ where }) => items.filter((item) => item.orderId === where.orderId) },
    product: { findMany: async () => [{ id: "p1", price: 1000, sizes: [{ label: "Brown", price: null }] }] },
    productSize: {
      findMany: async ({ where }) => sizes.filter((size) => where.productId.in.includes(size.productId) && (!where.stock || size.stock !== null)),
      updateMany: async ({ where, data }) => { const size = sizes.find((row) => row.id === where.id); if (!size) return { count: 0 }; if (data.stock.decrement != null) { if (size.stock < where.stock.gte) return { count: 0 }; size.stock -= data.stock.decrement; } else size.stock += data.stock.increment; return { count: 1 }; },
    },
    jobRun: { create: async ({ data }) => { jobRuns.push(data); return data; } },
    $transaction: async (callback) => callback(db),
  });
  return { orders, sizes, items, jobRuns };
}
const unpaid = (overrides) => ({ id: overrides.id, status: "WAITING_PAYMENT", paymentMethod: "BANK", source: "web", expiresAt: null, createdAt: new Date(), phone: null, ...overrides });

test("due orders: an explicit deadline wins; rows without one use the payment method's window", async () => {
  const now = new Date("2026-11-02T10:00:00Z");
  freshDb({ orders: [
    unpaid({ id: "chat-due", source: "chat", expiresAt: new Date(now.getTime() - 60_000), createdAt: new Date(now.getTime() - 2 * HOUR) }),
    unpaid({ id: "chat-live", source: "chat", expiresAt: new Date(now.getTime() + 30 * 60_000), createdAt: new Date(now.getTime() - 25 * HOUR) }),
    unpaid({ id: "bank-legacy-due", createdAt: new Date(now.getTime() - 25 * HOUR) }),
    unpaid({ id: "bank-legacy-live", createdAt: new Date(now.getTime() - 23 * HOUR) }),
    unpaid({ id: "qpay-legacy-due", paymentMethod: "QPAY", createdAt: new Date(now.getTime() - 16 * 60_000) }),
    unpaid({ id: "qpay-legacy-live", paymentMethod: "QPAY", createdAt: new Date(now.getTime() - 14 * 60_000) }),
    unpaid({ id: "paid", status: "PAID", expiresAt: new Date(now.getTime() - HOUR) }),
    unpaid({ id: "cod", paymentMethod: "COD", status: "COD_PENDING", createdAt: new Date(now.getTime() - 48 * HOUR) }),
  ] });
  const due = new Set();
  for (const query of dueOrderQueries(now)) for (const row of await db.order.findMany({ where: query.where })) if (!(query.kind === "legacy" && row.expiresAt != null)) due.add(row.id);
  assert.deepEqual([...due].sort(), ["bank-legacy-due", "chat-due", "qpay-legacy-due"]);
  // Scoped to one phone and the chat source, only that phone's chat rows qualify.
  const scoped = dueOrderQueries(now, { phone: "99000001", source: "chat" });
  assert.ok(scoped.every((query) => query.where.phone === "99000001" && query.where.source === "chat"));
});

test("expiry cancels each due order once, returns its stock once, and records the run", async () => {
  const now = Date.now();
  const { orders, sizes, items, jobRuns } = freshDb({
    orders: [unpaid({ id: "a", source: "chat", phone: "99000001", expiresAt: new Date(now - 1000) }), unpaid({ id: "b", source: "chat", phone: "99000002", expiresAt: new Date(now + HOUR) })],
    sizes: [{ id: "s1", productId: "p1", label: "Brown", stock: 3 }],
  });
  items.push({ orderId: "a", productId: "p1", size: "Brown", quantity: 2 }, { orderId: "b", productId: "p1", size: "Brown", quantity: 1 });
  assert.equal(await expireUnpaidOrders(db, { trigger: "cron" }), 1);
  assert.equal(orders[0].status, "CANCELLED");
  assert.ok(orders[0].expiredAt instanceof Date);
  assert.equal(orders[1].status, "WAITING_PAYMENT");
  assert.equal(sizes[0].stock, 5, "two units came back");
  // A second run (another instance, the cron) finds nothing and restocks nothing.
  assert.equal(await expireUnpaidOrders(db, { trigger: "cron" }), 0);
  assert.equal(sizes[0].stock, 5);
  assert.deepEqual(jobRuns.map((run) => [run.trigger, run.ok, run.processed]), [["cron", true, 1], ["cron", true, 0]]);
  // A sweep scoped to one phone leaves the other phone's order alone even when it is due.
  orders[1].expiresAt = new Date(now - 1000);
  assert.equal(await expireUnpaidOrders(db, { phone: "99000001", source: "chat", trigger: "inline" }), 0);
  assert.equal(orders[1].status, "WAITING_PAYMENT");
  assert.equal(await expireUnpaidOrders(db, { phone: "99000002", source: "chat", trigger: "inline" }), 1);
  assert.equal(jobRuns.length, 2, "inline sweeps are not recorded");
});

test("placeOrder stamps a deadline and a source, and a chat deadline is used as given", async () => {
  freshDb({ sizes: [{ id: "s1", productId: "p1", label: "Brown", stock: 5 }] });
  const before = Date.now();
  const web = await placeOrder({ userId: "u1", items: [{ productId: "p1", size: "Brown", quantity: 1 }], paymentMethod: "BANK", firstName: "A", lastName: "B", phone: "99000000" });
  assert.equal(web.order.source, "web");
  assert.ok(web.order.expiresAt.getTime() - before >= 24 * HOUR - 1000 && web.order.expiresAt.getTime() - before <= 24 * HOUR + 60_000, "website bank transfer: 24 hours");
  const qpay = await placeOrder({ userId: "u1", items: [{ productId: "p1", size: "Brown", quantity: 1 }], paymentMethod: "QPAY", firstName: "A", lastName: "B", phone: "99000000" });
  assert.ok(Math.abs(qpay.order.expiresAt.getTime() - before - 15 * 60_000) < 60_000, "QPay: 15 minutes");
  const deadline = new Date(before + 60 * 60_000);
  const chat = await placeOrder({ userId: "u1", items: [{ productId: "p1", size: "Brown", quantity: 1 }], paymentMethod: "BANK", source: "chat", expiresAt: deadline, firstName: "A", lastName: "B", phone: "99000000" });
  assert.equal(chat.order.source, "chat");
  assert.equal(chat.order.expiresAt, deadline);
  assert.equal(reservationDeadline({ paymentMethod: "COD" }), null);
  await assert.rejects(placeOrder({ userId: "u1", items: [{ productId: "p1", size: "Brown", quantity: 1 }], paymentMethod: "BANK", source: "mail", firstName: "A", lastName: "B", phone: "99000000" }), (error) => error.code === "INVALID_SOURCE");
  await assert.rejects(placeOrder({ userId: "u1", items: [{ productId: "p1", size: "Brown", quantity: 1 }], paymentMethod: "BANK", expiresAt: new Date(before - 1000), firstName: "A", lastName: "B", phone: "99000000" }), (error) => error.code === "INVALID_DEADLINE");
});

test("a stock shortfall first releases expired reservations, then the real buyer gets the unit", async () => {
  const now = Date.now();
  const { items, sizes } = freshDb({
    orders: [unpaid({ id: "stale", source: "chat", phone: "99000009", expiresAt: new Date(now - 1000) })],
    sizes: [{ id: "s1", productId: "p1", label: "Brown", stock: 0 }],
  });
  items.push({ orderId: "stale", productId: "p1", size: "Brown", quantity: 1 });
  const { order } = await placeOrder({ userId: "u2", items: [{ productId: "p1", size: "Brown", quantity: 1 }], paymentMethod: "QPAY", firstName: "A", lastName: "B", phone: "99000000" });
  assert.equal(order.status, "WAITING_PAYMENT");
  assert.equal(sizes[0].stock, 0, "the released unit went to the new order");
  await assert.rejects(placeOrder({ userId: "u3", items: [{ productId: "p1", size: "Brown", quantity: 1 }], paymentMethod: "QPAY", firstName: "A", lastName: "B", phone: "99000000" }), (error) => error.code === "OUT_OF_STOCK");
});

test("the cron endpoint fails closed in production and accepts only the configured secret", () => {
  const headers = (authorization) => ({ headers: authorization ? { authorization } : {} });
  assert.equal(cronAuthorized(headers(), { VERCEL_ENV: "production" }), false, "no secret in production: refused");
  assert.equal(cronAuthorized(headers(), { NODE_ENV: "development" }), true, "local without a secret: allowed");
  const env = { VERCEL_ENV: "production", CRON_SECRET: "a-long-enough-secret-value" };
  assert.equal(cronAuthorized(headers("Bearer a-long-enough-secret-value"), env), true);
  assert.equal(cronAuthorized({ headers: { "x-cron-secret": "a-long-enough-secret-value" } }, env), true);
  assert.equal(cronAuthorized(headers("Bearer wrong"), env), false);
  assert.equal(cronAuthorized(headers("Bearer short"), { VERCEL_ENV: "production", CRON_SECRET: "short" }), false, "a short secret never authorizes");
});
