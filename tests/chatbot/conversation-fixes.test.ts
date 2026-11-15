/**
 * Regression coverage for the four held-out failures of 2026-11-01 and the Latin-script examples
 * from the owner's brief: delivery time, the numbered catalogue, human requests and how long to
 * use a product. Rules only (no model), so these hold even when the model is off or over budget.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { runCustomerTurn, type TurnOutput } from "../../src/chatbot/turn";
import { setStateAdapter } from "../../src/chatbot/conversationState";
import { normText } from "../../src/chatbot/textNorm";
import { parseNumberedChoice } from "../../src/chatbot/fastPathRouting";
import { buildProductRequest } from "../../src/chatbot/productRequest";
import { context as baseContext, products } from "./helpers/fixtures";
import type { ChatMessage, ConversationState } from "../../src/chatbot/types";

async function talk(texts: string[], locale: "mn" | "en" = "mn", shape?: (ctx: ReturnType<typeof baseContext>) => void) {
  const states = new Map<string, ConversationState>();
  setStateAdapter({ read: async (id) => states.get(id) || {}, merge: async (id, patch) => { states.set(id, { ...states.get(id), ...patch }); } });
  const history: ChatMessage[] = [];
  const results: TurnOutput[] = [];
  let state: ConversationState = {};
  const senderId = randomUUID();
  try {
    for (const text of texts) {
      const ctx = baseContext(locale);
      ctx.policies = { delivery: "Тест: Улаанбаатарт 1–2 ажлын өдөр, орон нутагт 2–5 ажлын өдөрт хүрнэ.", returns: "Тест: буцаахгүй.", safety: "Тест: туршиж үзээрэй." };
      shape?.(ctx);
      const result = await runCustomerTurn({ text, history, state, context: ctx, senderId, askUnderstanding: null, askReply: null, orderLookup: async () => null });
      assert.ok(result.text.trim(), `reply for: ${text}`);
      results.push(result); state = result.state;
      history.push({ role: "user", text }, { role: "assistant", text: result.text });
    }
  } finally { setStateAdapter(null); }
  return results;
}

test("A. delivery-time questions get the delivery policy, never a product card", async () => {
  for (const text of ["hed hongiin dotor irhe ve", "hezee irh ve", "Хэдэн хоногт ирэх вэ?", "хүргэлт хэдэн өдөр болдог вэ", "how many days does delivery take", "Ulaangom ruu yvuulj boloh uu", "hurgej ugdug uu"]) {
    const [reply] = await talk([text]);
    assert.equal(reply.intent, "delivery", `${text} → ${reply.intent}`);
    assert.match(reply.text, /ажлын өдөр|working days|100₮/u, text);
    assert.doesNotMatch(reply.text, /Test Serum A — 1,000₮/, text);
  }
  // "How many days should I use it" is a usage question, not delivery.
  const [usage] = await talk(["Test Serum A хэдэн өдөр хэрэглэх вэ"]);
  assert.notEqual(usage.intent, "delivery");
});

test("B. 'what do you sell' is a numbered list from the rules, and 'the second one' resolves from it", async () => {
  for (const text of ["ymar buteegdehuun zardag ve", "Ямар бүтээгдэхүүн байгаа вэ?", "what do you sell", "ta nar yu zardag ve"]) {
    const [list] = await talk([text]);
    assert.equal(list.intent, "catalog", text);
    assert.match(list.text, /1\) /, text);
    assert.match(list.text, /2\) /, text);
  }
  const [, second] = await talk(["ymar buteegdehuun zardag ve", "2 dahi ni hed ve"]);
  assert.match(second.text, /2,000₮/);
  assert.doesNotMatch(second.text, /1,000₮/);
  // A recommendation request is not a bare listing (the writer, or the fallback list, answers it).
  const [recommend] = await talk(["нимгэн хөмсөгт ямар бүтээгдэхүүн тохирох вэ"]);
  assert.notEqual(recommend.intent, "clarify");
});

test("C. every way of asking for a person hands the chat over before anything else", async () => {
  for (const text of ["hun bnu", "huntei yarimaar bn", "operator bnu", "ajiltantai holbogdoh", "huntei holboj ogooch", "хүнтэй яримаар байна", "chatbot bish hun heregtei bn", "хүн байна уу", "can I talk to a real person", "not a bot please"]) {
    const [reply] = await talk([text]);
    assert.equal(reply.needsHuman, true, text);
    assert.equal(reply.handoffReason, "customer_request", text);
    assert.equal(reply.intent, "human", text);
  }
  // Still a hand-over when a product is in focus and the request is a follow-up.
  const [, follow] = await talk(["Test Serum A үнэ хэд вэ", "hun bnu"]);
  assert.equal(follow.needsHuman, true);
  // A damaged delivery is a complaint, with the reason recorded.
  const [complaint] = await talk(["baraa evdersen irsen"]);
  assert.equal(complaint.handoffReason, "complaint");
});

test("D. how long to use a product quotes the owner's FAQ, never a growth promise", async () => {
  const withFaq = (ctx: ReturnType<typeof baseContext>) => { ctx.content["test-serum-a"] = { howTo: ["Орой цэвэр хөмсөгт түрхэнэ."], faq: [{ q: "Хэдий хугацаанд хэрэглэх вэ?", a: "Тасралтгүй 8 долоо хоног хэрэглэхийг зөвлөдөг." }] }; };
  for (const text of ["Test Serum A hed sar hereglevel deer ve", "Test Serum A хэдэн сар хэрэглэх вэ", "how long should I use Test Serum A"]) {
    const [reply] = await talk([text], "mn", withFaq);
    assert.match(reply.text, /8 долоо хоног/, text);
    assert.doesNotMatch(reply.text, /ургана|ургалт/, text);
    assert.equal(reply.needsHuman, false, text);
  }
  // Without a published answer the assistant says so instead of inventing a course.
  const [honest] = await talk(["Test Pencil C хэдэн сар хэрэглэх вэ"], "mn", (ctx) => { ctx.content = { default: {} }; });
  assert.match(honest.text, /нийтлээгүй|00000000/);
  assert.doesNotMatch(honest.text, /\d+\s*(?:сар|долоо хоног)\s+хэрэглэ/);
  // A real growth question still gets the no-promise answer.
  const [growth] = await talk(["Test Serum A хэдэн хоногт ургах вэ"]);
  assert.equal(growth.intent, "medical");
});

test("the owner's Latin-script examples normalize to the words the rules read", () => {
  const expectations: Array<[string, RegExp]> = [
    ["une hed ve", /үнэ хэд вэ/], ["serumaa yaj heregleh ve", /сэрум яаж хэрэглэх вэ/], ["odoo bga yu", /одоо байгаа юу/], ["hurgej ugh uu", /хүргэлт/],
    ["hezee irh ve", /хэзээ ирэх вэ/], ["bi negiig avii", /нэгийг авъя/], ["hun bnu", /хүн байгаа юу/], ["zahiulmaar bn", /захиалъя/], ["qpay aar tulj boloh uu", /төлөх болох уу/],
    ["hurgej ugdug uu", /хүргэлт өгдөг уу/], ["tos 2iig avi", /тос 2 ийг авъя/], ["hums serum hedvee", /хөмсөг сэрум хэд вэ/],
  ];
  for (const [text, pattern] of expectations) assert.match(normText(text), pattern, text);
  // Proper nouns and numbers survive normalization.
  assert.match(normText("Ulaangom ruu 2 shirheg"), /ulaangom руу 2 ширхэг/);
});

test("ordinal picks and the duration topic are read from the whole message", () => {
  assert.deepEqual(parseNumberedChoice("2 dahi ni hed ve"), { index: 1, namePrefix: "" });
  assert.deepEqual(parseNumberedChoice("2 дахь нь"), { index: 1, namePrefix: "" });
  assert.equal(parseNumberedChoice("3-р хороо 5-р байр"), null);
  assert.equal(parseNumberedChoice("2 сар хэрэглэнэ"), null);
  assert.ok(buildProductRequest("хэдэн сар хэрэглэх вэ", products).topics.includes("duration"));
  assert.ok(buildProductRequest("яаж хадгалах вэ", products).topics.includes("storage"));
  assert.ok(!buildProductRequest("үнэ хэд вэ", products).topics.includes("duration"));
});

test("the owner's brief: informal purchase intent, context follow-ups and payment questions", async () => {
  const [, link] = await talk(["Test Serum A une hed ve", "bi negiig avii"]);
  assert.match(link.text, /\/buy\/test-serum-a/);
  const [order] = await talk(["zahiulmaar bn"]);
  assert.match(order.text, /Аль|1\)/);
  const [pay] = await talk(["qpay aar tulj boloh uu"]);
  assert.equal(pay.intent, "payment");
  assert.match(pay.text, /QPay/);
  const [, volume] = await talk(["Test Serum A үнэ хэд вэ", "Хэдэн мл вэ?"]);
  assert.match(volume.text, /Test Size A|нийтлээгүй/);
});
