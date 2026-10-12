import test from "node:test";
import assert from "node:assert/strict";
import { context, products } from "./fixtures";
import { formatProductLine, formatVariantLine } from "../../../src/chatbot/productPriceBlock";
import { verifyProductReply } from "../../../src/chatbot/productReplyVerification";
import { buildProductRequest, mergeProductSelection } from "../../../src/chatbot/productRequest";
import { buildUnderstandingPrompt, interpretUnderstanding } from "../../../src/chatbot/productUnderstanding";
import { runFlow } from "./flow";

export function priceInvariants(origin: string) {
  test(`${origin}: one formatter and verifier agree on each product price`, () => {
    const c = context();
    for (const p of products) { const text = formatProductLine(p, c); assert.match(text, new RegExp(p.foodName)); assert.equal(verifyProductReply({ reply: text, products: [p], context: c, approvedReply: text }), text); }
    const text = formatProductLine(products[0], c);
    for (const bad of [text.replace("1,000₮", "777₮"), text.replace(products[0].foodName, "Test Invented Product"), `${text}\nGuaranteed regrowth`, text.replace(products[0].id, "test-invented-link")]) assert.equal(verifyProductReply({ reply: bad, products: [products[0]], context: c, approvedReply: text }), "REFER");
  });
  test(`${origin}: wrong product's otherwise real price is still rejected`, () => {
    const c = context(), approved = formatProductLine(products[0], c);
    assert.equal(verifyProductReply({ reply: approved.replace("1,000₮", "2,000₮"), products, context: c, approvedReply: approved }), "REFER");
  });
}
export function variantInvariants(origin: string) {
  test(`${origin}: scarcity belongs to the selected variant and exact stock is hidden`, () => {
    const c = context(), p = products[1];
    const low = formatVariantLine(p.sizes[0], c), sold = formatVariantLine(p.sizes[1], c);
    assert.match(low, /Almost gone/); assert.match(sold, /Sold out/); assert.doesNotMatch(low, /1 remaining/);
    assert.equal(formatVariantLine(products[0].sizes[0], c), "Test Size A");
    assert.equal(verifyProductReply({ reply: low.replace("Almost gone", "Sold out"), products: [p], context: c, approvedReply: low }), "REFER");
    c.settings.showExactStock = true; assert.match(formatVariantLine(p.sizes[0], c), /1 remaining/);
  });
  test(`${origin}: colour choice persists for the same product and resets on product change`, () => {
    const req = buildProductRequest("Test Brown B байна уу", products);
    assert.equal(req.variantId, "test-colour-b");
    const selection = mergeProductSelection(products[1].id, req, null);
    assert.equal(mergeProductSelection(products[1].id, buildProductRequest("үнэ хэд вэ", products), selection).variantId, "test-colour-b");
    assert.equal(mergeProductSelection(products[0].id, buildProductRequest("үнэ хэд вэ", products), selection).variantId, null);
  });
}
export function understandingInvariants(origin: string) {
  test(`${origin}: understanding sees only real catalogue keys plus the remembered numbered order`, () => {
    const prompt = buildUnderstandingPrompt({ text: "the first one", history: [], products, pendingProductIds: [products[2].id, products[0].id] });
    assert.match(prompt.user, /1=P3, 2=P1/); assert.match(prompt.user, /Test Brown B/);
    const grounded = interpretUnderstanding(JSON.stringify({ intent: "product", products: ["P1", "invented"], topics: ["price", "invented-topic"], certainty: "one" }), prompt.keys, "price");
    assert.deepEqual(grounded?.products.map(p => p.id), [products[0].id]); assert.deepEqual(grounded?.topics, ["price"]);
    assert.equal(interpretUnderstanding("not JSON", prompt.keys), null);
  });
  test(`${origin}: an absent colour is unmet evidence rather than an invented variant`, () => {
    const prompt = buildUnderstandingPrompt({ text: "Test Invisible Colour", history: [], products });
    const grounded = interpretUnderstanding(JSON.stringify({ intent: "product", products: ["P1"], topics: ["variants"], variant: "Test Invisible Colour" }), prompt.keys);
    assert.equal(grounded?.unmet, "variant");
  });
}
export function flowInvariants(origin: string, turns: string[], locale: "en" | "mn" = "en", expected: Array<[number, string]> = []) {
  test(`${origin}: translated multi-turn customer behaviour`, async () => {
    const results = await runFlow(turns, locale);
    for (const [index, evidence] of expected) assert.ok(results[index].text.toLowerCase().includes(evidence.toLowerCase()), `Turn ${index + 1} must answer with ${evidence}; got ${results[index].text}`);
  });
}
