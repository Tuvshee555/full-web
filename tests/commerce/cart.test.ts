import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { normalizeCart, cartSubtotal, readCart, setQuantity } from "../../src/components/store/lib/cart";
import { useCart } from "../../src/app/(customer)/[locale]/store/cartStore";

test("corrupted saved cart entries cannot crash pages or produce invalid totals", () => {
  const valid = { productId: "one", quantity: 1, product: { productName: "Product", price: 100 } };
  const cart = normalizeCart([null, {}, { ...valid, quantity: -1 }, { ...valid, quantity: 1.5 }, { ...valid, quantity: 1000 }, { ...valid, product: { price: 1 } }, valid, { ...valid, quantity: 2 }]);
  assert.equal(cart.length, 1);
  assert.equal(cart[0].quantity, 3);
  assert.equal(cartSubtotal(cart), 300);
});

test("cart normalization preserves variants and caps combined quantities", () => {
  const base = { productId: "one", product: { productName: "Product", price: 100 } };
  const cart = normalizeCart([{ ...base, selectedSize: "A", quantity: 900 }, { ...base, selectedSize: "A", quantity: 200 }, { ...base, selectedSize: "B", quantity: 2 }]);
  assert.equal(cart.length, 2);
  assert.equal(cart[0].quantity, 999);
  assert.equal(cart[1].selectedSize, "B");
  assert.deepEqual(normalizeCart({ corrupt: true }), []);
});

const legacyItem = {
  foodId: "serum",
  quantity: 2,
  selectedSize: "20 ml",
  food: { id: "serum", foodName: "Brow serum", price: 39900, oldPrice: 45000, image: "/serum.png" },
};

test("existing saved carts preserve product details and merge with canonical variants", () => {
  const [migrated] = normalizeCart([legacyItem]);
  assert.deepEqual(migrated, {
    productId: "serum",
    quantity: 2,
    selectedSize: "20 ml",
    product: { id: "serum", productName: "Brow serum", price: 39900, oldPrice: 45000, image: "/serum.png" },
  });
  const combined = normalizeCart([
    legacyItem,
    { ...migrated, quantity: 3 },
    { ...legacyItem, selectedSize: "10 ml", quantity: 1 },
    { ...legacyItem, quantity: -1 },
    { ...legacyItem, food: { ...legacyItem.food, price: "invalid" } },
  ]);
  assert.equal(combined.length, 2);
  assert.equal(combined[0].quantity, 5);
  assert.equal(combined[1].selectedSize, "10 ml");
  assert.equal(cartSubtotal(combined), 239400);
});

function withBrowserCart(t: TestContext, value: unknown) {
  let saved = JSON.stringify(value);
  const setGlobal = (key: "localStorage" | "window", next: unknown) => {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value: next });
    t.after(() => {
      if (previous) Object.defineProperty(globalThis, key, previous);
      else Reflect.deleteProperty(globalThis, key);
    });
  };
  setGlobal("localStorage", {
    getItem: (key: string) => key === "cart" ? saved : null,
    setItem: (key: string, next: string) => { if (key === "cart") saved = next; },
    removeItem: (key: string) => { if (key === "cart") saved = "[]"; },
  });
  setGlobal("window", new EventTarget());
  return () => JSON.parse(saved);
}

test("reading an existing cart then changing quantity writes only product fields", (t) => {
  const savedCart = withBrowserCart(t, [legacyItem]);
  const cart = readCart();
  assert.equal(cart[0].product.productName, "Brow serum");
  setQuantity(cart[0].productId, cart[0].selectedSize, 4);
  assert.deepEqual(savedCart(), [{ ...cart[0], quantity: 4 }]);
  assert.equal(cartSubtotal(readCart()), 159600);
  assert.equal(JSON.stringify(savedCart()).includes("food"), false);
});

test("the alternate cart store loads existing carts and persists canonical items", (t) => {
  const savedCart = withBrowserCart(t, [legacyItem]);
  t.after(() => useCart.setState({ items: [] }));
  useCart.getState().load();
  const [item] = useCart.getState().items;
  assert.equal(item.product.productName, "Brow serum");
  useCart.getState().add({ ...item, quantity: 1 });
  assert.deepEqual(savedCart(), [{ ...item, quantity: 3 }]);
  assert.equal(JSON.stringify(savedCart()).includes("food"), false);
});
