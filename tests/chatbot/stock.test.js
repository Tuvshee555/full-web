import test from "node:test";
import assert from "node:assert/strict";
import { stockLevel, productStockLevel, publicInventory } from "../../server/utils/stockLevel.js";

test("stock is per size; untracked sizes cannot create urgency", () => {
  assert.equal(stockLevel({ stock: null }), "untracked");
  assert.equal(stockLevel({ stock: 0 }), "soldout");
  assert.equal(stockLevel({ stock: 1 }, 1), "low");
  assert.equal(stockLevel({ stock: 2 }, 1), "available");
  assert.equal(productStockLevel([{ stock: 1 }, { stock: null }]), "untracked");
  assert.equal(productStockLevel([{ stock: 1 }, { stock: 0 }]), "low");
  assert.equal(productStockLevel([{ stock: 0 }, { stock: 0 }]), "soldout");
});
test("public counts respect owner setting and admin retains editing data", () => {
  const p = { foodName: "Test Serum A", sizes: [{ stock: 2 }] };
  const settings = { lowStockThreshold: 5, showExactStock: false };
  assert.equal(publicInventory(p, settings).sizes[0].stock, undefined);
  assert.equal(publicInventory(p, settings).sizes[0].stockLevel, "low");
  assert.equal(publicInventory(p, settings, true).sizes[0].stock, 2);
  assert.equal(publicInventory(p, { ...settings, showExactStock: true }).sizes[0].stock, 2);
});
test("an omitted or invented variant cannot bypass sold-out stock", async () => {
  process.env.DATABASE_URL ||= "postgresql://test:test@localhost:5432/test";
  const { applyStockDecrements } = await import("../../server/utils/stock.js");
  const tx = { foodSize: { findMany: async () => [{ id: "fake-size", label: "Test size", stock: 0 }], updateMany: async () => ({ count: 0 }) } };
  for (const size of [undefined, "Test invented size"]) await assert.rejects(applyStockDecrements(tx, [{ foodId: "fake-product", quantity: 1, size }]), { code: "INVALID_SIZE" });
  await assert.rejects(applyStockDecrements(tx, [{ foodId: "fake-product", quantity: 1, size: "Test size" }]), { code: "OUT_OF_STOCK" });
});
