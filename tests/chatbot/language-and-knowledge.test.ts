import test from "node:test";
import assert from "node:assert/strict";
import { intentProbe, keywordTokens, normText } from "../../src/chatbot/textNorm";
import { matchFaq } from "../../src/chatbot/knowledge";
import { buildProductRequest } from "../../src/chatbot/productRequest";
import { buildProductAnswerPlan, productVolume } from "../../src/chatbot/productAnswerPlan";
import { howToSteps, productFaqItems, productKnowledge } from "../../src/chatbot/catalogue";
import { resolveProductFromUserMessage } from "../../src/chatbot/productSearch";
import { context as baseContext, products } from "./helpers/fixtures";
import { runFlow } from "./helpers/flow";

test("Latin-script Mongolian, glued words and slang normalize to the Cyrillic the patterns use", () => {
  assert.equal(normText("une hed ve"), "үнэ хэд вэ");
  assert.equal(normText("unehedve"), "үнэ хэд вэ");
  assert.equal(normText("serum odoo bga yu"), "сэрум одоо байгаа юу");
  assert.equal(normText("hurgej ugh uu"), "хүргэлт өгөх уу");
  assert.equal(normText("hezee ur dun garah ve"), "хэзээ үр дүн гарах вэ");
  assert.equal(normText("huntei holbogdmoor baina"), "хүнтэй холбогдох байгаа");
  assert.equal(normText("serum zahialya"), "сэрум захиалъя");
  assert.equal(normText("odo hudaldaj away"), "одоо худалдаж авъя");
  assert.match(intentProbe("tanai buteegdhuni une hedwe"), /бүтээгдэхүүн үнэ хэд вэ/);
});

test("function words never identify a product: 'Харин' no longer matches the pencil 'Нарийн'", () => {
  assert.deepEqual(keywordTokens("Харин яаж хэрэглэх юм?"), []);
  const catalogue = [{ id: "p1", productName: "Нарийн хөмсөгний харандаа", price: 1, sizes: [] }, { id: "p2", productName: "Хөмсөгний сэрум", price: 1, sizes: [] }];
  assert.equal(resolveProductFromUserMessage("Харин яаж хэрэглэх юм?", catalogue).status, "not_found");
  assert.equal(resolveProductFromUserMessage("нарийн харандаа", catalogue).status, "verified");
});

test("the longest shade label wins when a shorter one is contained in it", () => {
  const catalogue = [{ id: "p1", productName: "Pencil", price: 1, sizes: [{ id: "a", label: "Хүрэн", stock: 0 }, { id: "b", label: "Хар хүрэн", stock: null }, { id: "c", label: "Цайвар хүрэн", stock: 2 }] }];
  assert.equal(buildProductRequest("хар хүрэн нь байна уу", catalogue).variant, "Хар хүрэн");
  assert.equal(buildProductRequest("хүрэн байна уу", catalogue).variant, "Хүрэн");
  assert.equal(buildProductRequest("цайвар хүрэн", catalogue).variantId, "c");
});

test("volume questions are read in both scripts and answered from the published volume or a size label", () => {
  for (const text of ["хэдэн мл вэ", "heden ml ve", "How many ml is it?", "хэмжээ нь хэд вэ"]) assert.ok(buildProductRequest(text, products).topics.includes("volume"), text);
  assert.equal(productVolume({ id: "x", productName: "X", price: 1, sizes: [], volume: "5 мл" }), "5 мл");
  assert.equal(productVolume({ id: "x", productName: "X", price: 1, sizes: [{ id: "s", label: "10 мл", stock: null }] }), "10 мл");
  assert.equal(productVolume({ id: "x", productName: "X", price: 1, sizes: [{ id: "s", label: "Хүрэн", stock: null }] }), null);
});

test("the owner's FAQ matches typo-tolerant questions and never loose ones", () => {
  const items = [{ q: "Ажлын цаг хэд вэ?", a: "10:00–18:00" }, { q: "Очиж авч болох уу?", a: "Болно." }];
  assert.equal(matchFaq("ажлын цаг хэд вэ", items)?.item.a, "10:00–18:00");
  assert.equal(matchFaq("ajliin tsag hed ve", items)?.item.a, "10:00–18:00");
  assert.equal(matchFaq("очиж авч болох уу", items)?.item.a, "Болно.");
  assert.equal(matchFaq("үнэ хэд вэ", items), null);
  assert.equal(matchFaq("цаг", items), null);
});

test("published product facts come from the database fields, and an unpublished fact is said so", () => {
  assert.deepEqual(howToSteps("1. Орой түрхэнэ.\n- Өдөрт нэг удаа.\n\n"), ["Орой түрхэнэ.", "Өдөрт нэг удаа."]);
  assert.deepEqual(productFaqItems([{ q: " A ", a: " B " }, { q: "", a: "x" }, "junk"]), [{ q: "A", a: "B" }]);
  const product = { id: "p", productName: "Сэрум", price: 1000, sizes: [], howToUse: "Орой түрхэнэ.", ingredientList: "Aqua", faq: [{ q: "Хэдий хугацаанд хэрэглэх вэ?", a: "8 долоо хоног." }] };
  const knowledge = productKnowledge(product);
  assert.deepEqual(knowledge.howTo, ["Орой түрхэнэ."]);
  assert.equal(knowledge.fullIngredients, "Aqua");
  const ctx = baseContext("mn");
  ctx.products = [product];
  ctx.content = { default: {}, p: knowledge };
  const usage = buildProductAnswerPlan({ text: "Сэрум хэдий хугацаанд хэрэглэх вэ?", context: ctx, route: { matchText: "", scopedClarify: null, chosenProductId: "p" } });
  assert.match(usage!.reply, /8 долоо хоног/);
  assert.match(usage!.reply, /Орой түрхэнэ/);
  const bare = { ...product, howToUse: null, ingredientList: null, faq: [] };
  ctx.products = [bare]; ctx.content = { default: {}, p: productKnowledge(bare) };
  const missing = buildProductAnswerPlan({ text: "Сэрум найрлага юу вэ?", context: ctx, route: { matchText: "", scopedClarify: null, chosenProductId: "p" } });
  assert.equal(missing!.status, "answered");
  assert.deepEqual(missing!.unpublished, ["ingredients"]);
  assert.match(missing!.reply, /нийтлээгүй/);
  assert.doesNotMatch(missing!.reply, /Aqua/);
});

test("a Latin greeting still greets, and a question with no stored answer invents nothing", async () => {
  const results = await runFlow(["sain uu", "Ажлын цаг хэд вэ?"], "mn");
  assert.match(results[0].text, /Сайн байна уу/);
  assert.doesNotMatch(results[1].text, /\d{1,2}:\d{2}/); // the test fixture has no shop FAQ, so no opening hours appear
});
