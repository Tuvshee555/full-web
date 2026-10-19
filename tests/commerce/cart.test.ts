import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCart, cartSubtotal } from "../../src/components/store/lib/cart";

test("corrupted saved cart entries cannot crash pages or produce invalid totals", () => {
  const valid = { foodId: "one", quantity: 1, food: { foodName: "Product", price: 100 } };
  const cart = normalizeCart([null, {}, { ...valid, quantity: -1 }, { ...valid, quantity: 1.5 }, { ...valid, quantity: 1000 }, { ...valid, food: { price: 1 } }, valid, { ...valid, quantity: 2 }]);
  assert.equal(cart.length, 1);
  assert.equal(cart[0].quantity, 3);
  assert.equal(cartSubtotal(cart), 300);
});

test("cart normalization preserves variants and caps combined quantities", () => {
  const base = { foodId: "one", food: { foodName: "Product", price: 100 } };
  const cart = normalizeCart([{ ...base, selectedSize: "A", quantity: 900 }, { ...base, selectedSize: "A", quantity: 200 }, { ...base, selectedSize: "B", quantity: 2 }]);
  assert.equal(cart.length, 2);
  assert.equal(cart[0].quantity, 999);
  assert.equal(cart[1].selectedSize, "B");
  assert.deepEqual(normalizeCart({ corrupt: true }), []);
});
