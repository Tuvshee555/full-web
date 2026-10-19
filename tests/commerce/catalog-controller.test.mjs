import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { invalidate } from "../../server/utils/cache.js";

// All database access is replaced before importing controllers. An unexpected
// call throws; these tests never connect to a database or payment service.
process.env.DATABASE_URL ||= "postgresql://catalog-tests.invalid/no-network";
const db = { product: {}, productSize: {}, orderItem: {}, category: {}, chatSettings: {} };
globalThis.prisma = db;
const { getProduct } = await import("../../server/controller/products/get-product.js");
const { getProductById } = await import("../../server/controller/products/get-product-by-id.js");
const { deleteProduct } = await import("../../server/controller/products/delete-product.js");
const { deleteAllProducts } = await import("../../server/controller/products/delete-all-product.js");
const { updateProduct } = await import("../../server/controller/products/update-product.js");
const { createProduct } = await import("../../server/controller/products/create-product.js");
const { validateProductInput } = await import("../../server/controller/products/validate-product.js");
const { updateCategories } = await import("../../server/controller/categories/update-categories.js");
const { getCategoryProductsTree } = await import("../../server/controller/categories/get-category-products-tree.js");
const { getSettings, invalidateSettings } = await import("../../src/chatbot/settings.mjs");

const settings = { id: "default", lowStockThreshold: 5, showExactStock: false };
const response = () => ({ statusCode: 200, headers: {}, body: undefined,
  status(value) { this.statusCode = value; return this; },
  set(key, value) { this.headers[key] = value; return this; },
  json(body) { this.body = body; return this; },
});
beforeEach(() => {
  invalidate("");
  // tsx may load the root .js settings module through its CJS bridge while
  // server/package.json keeps controller modules ESM. Clear both instances.
  invalidateSettings();
  for (const model of Object.values(db)) {
    if (model && typeof model === "object") for (const key of Object.keys(model)) delete model[key];
  }
  db.$transaction = async (callback) => callback(db);
  db.chatSettings.findUnique = async () => settings;
  db.orderItem.findFirst = async () => null;
});

test("settings reads are coalesced, avoid upsert writes, and refresh after an edit", async () => {
  let reads = 0;
  db.chatSettings.findUnique = async () => { reads += 1; return { ...settings, lowStockThreshold: reads }; };
  const values = await Promise.all(Array.from({ length: 100 }, () => getSettings()));
  assert.equal(reads, 1);
  assert.equal(values[99].lowStockThreshold, 1);
  invalidateSettings();
  assert.equal((await getSettings()).lowStockThreshold, 2);
  assert.equal(reads, 2);
});

test("first settings read creates defaults only if no settings row exists", async () => {
  db.chatSettings.findUnique = async () => null;
  let writes = 0;
  db.chatSettings.upsert = async () => { writes += 1; return settings; };
  await Promise.all([getSettings(), getSettings()]);
  assert.equal(writes, 1);
});

test("catalog bursts use one product query while preserving public stock privacy", async () => {
  let reads = 0;
  db.product.findMany = async () => { reads += 1; return [{ id: "product", sizes: [{ label: "Regular", stock: 42 }] }]; };
  const responses = Array.from({ length: 25 }, response);
  await Promise.all(responses.map((res) => getProduct({}, res)));
  assert.equal(reads, 1);
  assert.equal(responses[0].body[0].sizes[0].stock, undefined);
  const admin = response();
  await getProduct({ user: { role: "ADMIN" } }, admin);
  assert.equal(admin.body[0].sizes[0].stock, 42);
  assert.equal(admin.headers["Cache-Control"], "private, no-store");
  assert.equal(responses[0].body[0].sizes[0].stock, undefined);
});

test("product details read fresh inventory and distinguish missing products", async () => {
  let stock = 2;
  db.product.findUnique = async ({ where }) => where.id === "missing" ? null : { id: where.id, sizes: [{ label: "Regular", stock: stock-- }] };
  const first = response();
  await getProductById({ params: { id: "one" } }, first);
  const second = response();
  await getProductById({ params: { id: "one" } }, second);
  assert.equal(first.body.sizes[0].stockLevel, "low");
  assert.equal(second.body.sizes[0].stockLevel, "low");
  assert.equal(stock, 0);
  const missing = response();
  await getProductById({ params: { id: "missing" } }, missing);
  assert.equal(missing.statusCode, 404);
});

test("deleting an ordered product or the whole catalog preserves purchase history", async () => {
  db.orderItem.findFirst = async () => ({ id: "historic-order-item" });
  for (const controller of [deleteProduct, deleteAllProducts]) {
    const res = response();
    await controller({ params: { id: "product" } }, res);
    assert.equal(res.statusCode, 409);
  }
});

test("product deletion removes sizes and product atomically without deleting order items", async () => {
  const calls = [];
  db.orderItem.findFirst = async () => null;
  db.productSize.deleteMany = async () => calls.push("sizes");
  db.product.delete = async () => calls.push("product");
  const res = response();
  await deleteProduct({ params: { id: "product" } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(calls, ["sizes", "product"]);
});

test("size edits distinguish explicit untracked stock from legacy omitted stock", async () => {
  db.productSize.findMany = async () => [{ label: "Regular", stock: 12 }, { label: "Large", stock: 9 }];
  let saved;
  db.product.update = async ({ data }) => { saved = data; return { id: "product", ...data }; };
  const res = response();
  await updateProduct({ params: { id: "product" }, body: { sizes: [{ label: "Regular", stock: null }, "Large"] } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(saved.sizes.create, [{ label: "Regular", stock: null, price: null }, { label: "Large", stock: 9, price: null }]);
});

test("size edits keep a size's own price unless the edit sends a new one", async () => {
  db.productSize.findMany = async () => [{ label: "10 ml", stock: 4, price: null }, { label: "20 ml", stock: 2, price: 69900 }];
  let saved;
  db.product.update = async ({ data }) => { saved = data; return { id: "product", ...data }; };
  await updateProduct({ params: { id: "product" }, body: { sizes: ["10 ml", "20 ml"] } }, response());
  assert.deepEqual(saved.sizes.create.map((size) => size.price), [null, 69900]);
  await updateProduct({ params: { id: "product" }, body: { sizes: [{ label: "10 ml", price: 39900 }, { label: "20 ml", price: null }] } }, response());
  assert.deepEqual(saved.sizes.create.map((size) => size.price), [39900, null]);
  const bad = response();
  await updateProduct({ params: { id: "product" }, body: { sizes: [{ label: "10 ml", price: -5 }] } }, bad);
  assert.equal(bad.statusCode, 400);
});

test("malformed prices and inventory return a validation error without changing the database", async () => {
  for (const body of [
    { price: -1 }, { price: "100oops" }, { price: Infinity }, { price: true },
    { discount: 101 }, { salesCount: -1 },
    { sizes: [{ label: "Regular", stock: -3 }] },
    { sizes: [{ label: "Regular", stock: 1.5 }] },
    { sizes: ["Regular", "regular"] },
  ]) {
    const updated = response();
    await updateProduct({ params: { id: "product" }, body }, updated);
    assert.equal(updated.statusCode, 400, JSON.stringify(body));
    const created = response();
    await createProduct({ body: { productName: "Valid name", ...body } }, created);
    assert.equal(created.statusCode, 400, JSON.stringify(body));
  }
  assert.equal(validateProductInput({ price: 20, sizes: [{ label: "Regular", stock: null }, { label: "Large", stock: 0 }] }), null);
});

test("an inventory edit concurrent with a sale returns a retryable conflict", async () => {
  db.$transaction = async (_callback, options) => {
    assert.equal(options.isolationLevel, "Serializable");
    throw Object.assign(new Error("write conflict"), { code: "P2034" });
  };
  const res = response();
  await updateProduct({ params: { id: "product" }, body: { price: 10 } }, res);
  assert.equal(res.statusCode, 409);
  assert.match(res.body.error, /Inventory changed/);
});

test("unfulfilled orders prevent variant removal or stock tracking changes", async () => {
  db.productSize.findMany = async () => [{ label: "Regular", stock: 12 }];
  let orderChecks = 0;
  db.orderItem.findFirst = async ({ where }) => {
    orderChecks += 1;
    assert.deepEqual(where.size.in, ["Regular"]);
    assert.ok(where.order.status.in.includes("WAITING_PAYMENT"));
    return { id: "reserved-item" };
  };
  for (const sizes of [[], [{ label: "Regular", stock: null }]]) {
    const res = response();
    await updateProduct({ params: { id: "product" }, body: { sizes } }, res);
    assert.equal(res.statusCode, 409);
    assert.match(res.body.error, /active orders/);
  }
  assert.equal(orderChecks, 2);
  db.product.update = async () => ({ id: "product" });
  const quantityOnly = response();
  await updateProduct({ params: { id: "product" }, body: { sizes: [{ label: "Regular", stock: 20 }] } }, quantityOnly);
  assert.equal(quantityOnly.statusCode, 200);
  assert.equal(orderChecks, 2);
});

test("saving a stale editor cannot undo completed checkout reservations", async () => {
  db.productSize.findMany = async () => [{ label: "Regular", stock: 9 }];
  let saved;
  db.product.update = async ({ data }) => { saved = data; return { id: "product" }; };
  const stale = response();
  await updateProduct({ params: { id: "product" }, body: { sizes: [{ label: "Regular", stock: 15, expectedStock: 12 }] } }, stale);
  assert.equal(stale.statusCode, 409);
  assert.equal(saved, undefined);
  const descriptionOnly = response();
  await updateProduct({ params: { id: "product" }, body: { ingredients: "Updated description", sizes: [{ label: "Regular" }] } }, descriptionOnly);
  assert.equal(descriptionOnly.statusCode, 200);
  assert.equal(saved.sizes.create[0].stock, 9);
});

test("category edits reject descendant cycles before writing", async () => {
  db.category.findMany = async () => [{ id: "root", parentId: null }, { id: "child", parentId: "root" }, { id: "leaf", parentId: "child" }];
  const res = response();
  await updateCategories({ body: { id: "root", parentId: "leaf" } }, res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /descendants/);
});

test("category descendants include all nested products with one category query across collections", async () => {
  let reads = 0;
  db.category.findMany = async () => { reads += 1; return [
    { id: "root", categoryName: "Root", parentId: null },
    { id: "child", categoryName: "Child", parentId: "root" },
    { id: "leaf", categoryName: "Leaf", parentId: "child" },
  ]; };
  const scopes = [];
  db.product.findMany = async ({ where }) => { scopes.push(where.categoryId.in); return []; };
  await getCategoryProductsTree({ params: { id: "root" } }, response());
  await getCategoryProductsTree({ params: { id: "child" } }, response());
  assert.equal(reads, 1);
  assert.deepEqual(scopes, [["root", "child", "leaf"], ["child", "leaf"]]);
});
