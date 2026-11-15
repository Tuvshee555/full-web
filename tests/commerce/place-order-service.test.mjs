import test from "node:test";
import assert from "node:assert/strict";
import { knowledgeFields, normalizeProductFaq, validateProductInput } from "../../server/controller/products/validate-product.js";

// The order service is exercised with an in-memory Prisma double: no database, no network.
process.env.DATABASE_URL ||= "postgresql://service-tests.invalid/no-network";
process.env.DELIVERY_FEE = "9000";
const db = {};
globalThis.prisma = db;
const { OrderError, placeOrder } = await import("../../server/services/placeOrder.js");

function freshDb() {
  const orders = [];
  const sizes = [{ id: "s1", productId: "p1", label: "Brown", stock: 2 }, { id: "s2", productId: "p1", label: "Dark", stock: null }];
  Object.assign(db, {
    order: {
      findUnique: async ({ where }) => orders.find((row) => row.idempotencyKey === where.idempotencyKey) || null,
      create: async ({ data }) => { const row = { id: `o${orders.length + 1}`, ...data }; orders.push(row); return row; },
    },
    product: { findMany: async () => [{ id: "p1", price: 1000, sizes: [{ label: "Brown", price: null }, { label: "Dark", price: 1500 }] }] },
    productSize: {
      findMany: async ({ where }) => sizes.filter((size) => where.productId.in.includes(size.productId)),
      updateMany: async ({ where, data }) => { const size = sizes.find((row) => row.id === where.id); if (!size || size.stock < where.stock.gte) return { count: 0 }; size.stock -= data.stock.decrement; return { count: 1 }; },
    },
    $transaction: async (callback) => callback(db),
  });
  return { orders, sizes };
}

test("placeOrder prices from the catalogue, adds the delivery fee and reserves stock", async () => {
  const { orders, sizes } = freshDb();
  const { order, replayed } = await placeOrder({ userId: "u1", items: [{ productId: "p1", size: "Brown", quantity: 2 }], paymentMethod: "BANK", deliveryZone: "UB", idempotencyKey: "k1", firstName: "A", lastName: "B", phone: "99000000", city: "UB", district: "D", khoroo: "1", address: "x" });
  assert.equal(replayed, false);
  assert.equal(order.totalPrice, 2 * 1000 + 9000);
  assert.equal(order.status, "WAITING_PAYMENT");
  assert.equal(orders[0].orderItems.create[0].unitPrice, 1000);
  assert.equal(sizes[0].stock, 0);
  const again = await placeOrder({ userId: "u1", items: [{ productId: "p1", size: "Brown", quantity: 2 }], paymentMethod: "BANK", idempotencyKey: "k1", firstName: "A", lastName: "B", phone: "99000000" });
  assert.equal(again.replayed, true);
  assert.equal(again.order.id, order.id);
});

test("placeOrder refuses a short size, a stale total and a foreign idempotency key with coded errors", async () => {
  freshDb();
  await assert.rejects(placeOrder({ userId: "u1", items: [{ productId: "p1", size: "Brown", quantity: 3 }], paymentMethod: "BANK", firstName: "A", lastName: "B", phone: "99000000" }), (error) => error instanceof OrderError && error.code === "OUT_OF_STOCK" && error.status === 409);
  await assert.rejects(placeOrder({ userId: "u1", items: [{ productId: "p1", size: "Dark", quantity: 1 }], paymentMethod: "BANK", totalPrice: 1500, firstName: "A", lastName: "B", phone: "99000000" }), (error) => error instanceof OrderError && error.code === "PRICE_CHANGED" && error.extra.totalPrice === 10500);
  await placeOrder({ userId: "u1", items: [{ productId: "p1", size: "Dark", quantity: 1 }], paymentMethod: "BANK", idempotencyKey: "shared", firstName: "A", lastName: "B", phone: "99000000" });
  await assert.rejects(placeOrder({ userId: "u2", items: [{ productId: "p1", size: "Dark", quantity: 1 }], paymentMethod: "BANK", idempotencyKey: "shared", firstName: "A", lastName: "B", phone: "99000000" }), (error) => error instanceof OrderError && error.code === "KEY_IN_USE");
  await assert.rejects(placeOrder({ userId: "u1", items: [{ productId: "p1", size: "Dark", quantity: 1 }], paymentMethod: "CARD", firstName: "A", lastName: "B", phone: "99000000" }), (error) => error.code === "INVALID_PAYMENT_METHOD");
});

test("product knowledge fields are validated and normalized", () => {
  assert.equal(validateProductInput({ productName: "X", volume: "5 мл", howToUse: "a\nb", faq: [{ q: "Q", a: "A" }] }), null);
  assert.equal(validateProductInput({ volume: "x".repeat(61) }), "Invalid volume");
  assert.equal(validateProductInput({ faq: [{ q: "Q" }] }), "Invalid faq");
  assert.equal(validateProductInput({ faq: "nope" }), "Invalid faq");
  assert.deepEqual(normalizeProductFaq([{ q: " Q ", a: " A " }, { q: "", a: "" }]), [{ q: "Q", a: "A" }]);
  assert.deepEqual(knowledgeFields({ volume: "  ", howToUse: " steps ", faq: [{ q: "Q", a: "A" }] }), { volume: null, howToUse: "steps", faq: [{ q: "Q", a: "A" }] });
  assert.deepEqual(knowledgeFields({ price: 1 }), {});
});
