import test from "node:test";
import assert from "node:assert/strict";
import { context as baseContext } from "./helpers/fixtures";
import { formatProductLine, formatVariantLine, productPrices } from "../../src/chatbot/productPriceBlock";
import { explainFreeformReply } from "../../src/chatbot/productReplyVerification";
import { runCustomerTurn } from "../../src/chatbot/turn";
import { priceRange, sizePrice } from "../../src/components/store/lib/product";
import type { CatalogProduct } from "../../src/chatbot/types";

// A product whose second size has its own price (fake fixture values only).
const oil: CatalogProduct = {
  id: "test-oil-e", productName: "Test Oil E", price: 1000, oldPrice: null, category: { name: "Test oil" },
  sizes: [{ id: "test-oil-small", label: "Test Small", price: null, stock: null }, { id: "test-oil-large", label: "Test Large", price: 1700, stock: null }],
};
const context = (locale: "mn" | "en" = "mn") => { const c = baseContext(locale); c.products = [...c.products, structuredClone(oil)]; return c; };

test("storefront: a size's own price wins, otherwise the product price", () => {
  assert.equal(sizePrice(oil, "Test Large"), 1700);
  assert.equal(sizePrice(oil, "Test Small"), 1000);
  assert.equal(sizePrice(oil, null), 1000);
  assert.deepEqual(priceRange(oil), { min: 1000, max: 1700 });
  assert.deepEqual(priceRange({ price: 500, sizes: [] }), { min: 500, max: 500 });
});

test("bot formatter shows each size's price and the product's range", () => {
  const c = context();
  assert.deepEqual(productPrices(oil), [1000, 1700]);
  assert.equal(formatVariantLine(oil.sizes[1], c), "Test Large — 1,700₮");
  assert.equal(formatVariantLine(oil.sizes[0], c), "Test Small");
  assert.match(formatProductLine(oil, c, { link: false }), /^Test Oil E — 1,000₮ – 1,700₮$/);
});

test("fact check accepts a size's real price and still rejects an invented one", () => {
  const c = context();
  assert.equal(explainFreeformReply("Test Oil E — 1,700₮ (Test Large)", c).ok, true);
  assert.equal(explainFreeformReply("Test Oil E — 1,500₮", c).ok, false);
});

test("asking a size product's price lists every size with its price", async () => {
  const result = await runCustomerTurn({
    text: "Test Oil E үнэ хэд вэ", history: [], state: {}, context: context(), senderId: "size-test",
    askUnderstanding: null, askReply: null, orderLookup: async () => null,
  });
  assert.match(result.text, /Test Large — 1,700₮/);
  assert.match(result.text, /Test Small/);
  assert.doesNotMatch(result.text, /1,500₮/);
});
