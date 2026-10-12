import test from "node:test";
import assert from "node:assert/strict";
import { formatProductLine, renderReply, verifyReply } from "../reply.js";
// Pure tests do not connect to this database or use real catalogue fixtures.
process.env.DATABASE_URL ||= "postgresql://test:test@localhost:5432/test";
const { detectLanguage, stripProductNames, handoffRequested, medicalQuestion } = await import("../understanding.js");
const { privateOrderStatus } = await import("../security.js");
const context = { locale: "en", site: "https://example.invalid", products: [{ id: "fake-a", foodName: "Test Serum A", price: 1000, oldPrice: 2000, sizes: [{ label: "Test size", stock: 1 }] }], settings: { lowStockThreshold: 5, showExactStock: false }, content: { default: {} } };
const plan = { intents: ["price"], productIds: ["fake-a"] };

test("one formatter supplies prices, variant urgency and links", () => {
  const line = formatProductLine(context.products[0], context);
  assert.match(line, /Test Serum A — 1,000₮/);
  assert.match(line, /Test size · Almost gone/);
  assert.doesNotMatch(line, /\(1\)/);
  assert.match(line, /example.invalid\/en\/products\/fake-a/);
});
test("verifier rejects invented price, product, claim and altered stock", () => {
  const reply = renderReply(plan, context).text;
  assert.ok(verifyReply(reply, plan, context));
  assert.equal(verifyReply(reply.replace("1,000₮", "777₮"), plan, context), false);
  assert.equal(verifyReply(reply.replace("Test Serum A", "Test Invented B"), plan, context), false);
  assert.equal(verifyReply(reply + "\nGuaranteed regrowth", plan, context), false);
  assert.equal(verifyReply(reply.replace("Almost gone", "Sold out"), plan, context), false);
  assert.equal(verifyReply(reply, { ...plan, productIds: ["fake-missing"] }, context), false);
});
test("product FAQ answers are exact source evidence and cannot introduce competing prices", () => {
  const c = { ...context, content: { default: { faq: [{ q: "Test question", a: "Test factual answer" }, { q: "Test price", a: "777₮" }] } }, store: { contact: { phone: "", email: "" } }, settings: { ...context.settings, handoffEn: "Test handoff" } };
  const faqPlan = { intents: ["productFaq"], productIds: ["fake-a"], faqIndexes: [0] };
  assert.ok(renderReply(faqPlan, c).text.includes("Test factual answer"));
  assert.ok(verifyReply(renderReply(faqPlan, c).text, faqPlan, c));
  assert.equal(renderReply({ ...faqPlan, faqIndexes: [1] }, c).needsHuman, true);
});
test("order privacy requires both credentials and returns status only", async () => {
  let queries = 0;
  const db = { foodOrder: { findUnique: async ({ select }) => { queries++; assert.deepEqual(select, { phone: true, status: true }); return { phone: "00000001", status: "PAID" }; } } };
  assert.equal(await privateOrderStatus(db, "TEST-ORDER", "00000002"), null);
  assert.equal(await privateOrderStatus(db, "", "00000001"), null);
  assert.equal(await privateOrderStatus(db, "TEST-ORDER", ""), null);
  assert.equal(await privateOrderStatus(db, "TEST-ORDER", "+976 00000001"), "PAID");
  assert.equal(queries, 2);
  const nonexistent = { foodOrder: { findUnique: async () => null } };
  assert.equal(await privateOrderStatus(nonexistent, "TEST-ORDER", "00000001"), null);
});
test("Cyrillic and Latin Mongolian resolve to mn; English stays en", () => {
  for (const text of ["Үнэ хэд вэ?", "sain baina uu", "une hed ve", "hurgelt bgaa yu", "dansnii dugaar", "humsug heregleh"]) assert.equal(detectLanguage(text, "en"), "mn", text);
  for (const text of ["What does it cost?", "I want a human", "Delivery please", "Is it available?"]) assert.equal(detectLanguage(text, "mn"), "en", text);
  assert.equal(detectLanguage("?", "en"), "en");
  assert.equal(detectLanguage(stripProductNames("What is the price of Тест бүтээгдэхүүн А?", ["Тест бүтээгдэхүүн А"]), "mn"), "en");
  assert.ok(handoffRequested("Хүнтэй холбогдмоор байна"));
  assert.ok(handoffRequested("My payment failed"));
  assert.ok(medicalQuestion("Will it regrow in two weeks?"));
});
