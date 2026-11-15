import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { runCustomerTurn, type TurnOutput } from "../../src/chatbot/turn";
import { setStateAdapter } from "../../src/chatbot/conversationState";
import { BUY_INTENT, NO, PICKUP_QUESTION, YES, buyLink, matchVariant, parseDistrict, parseKhoroo, parsePhone, parseQuantity, readDraft } from "../../src/chatbot/commerce/purchase";
import { intentProbe } from "../../src/chatbot/textNorm";
import { context as baseContext, products } from "./helpers/fixtures";
import type { ChatMessage, ChatOrderRequest, ConversationState } from "../../src/chatbot/types";

/** Runs a conversation through the engine with a recording fake order service. */
async function conversation(texts: string[], options: { locale?: "mn" | "en"; chatOrders?: boolean; placeOrder?: ((request: ChatOrderRequest) => Promise<{ orderNumber: string; totalPrice: number; deliveryFee: number; status: string; paymentMethod: string }>) | null } = {}) {
  const states = new Map<string, ConversationState>();
  setStateAdapter({ read: async (id) => states.get(id) || {}, merge: async (id, patch) => { states.set(id, { ...states.get(id), ...patch }); } });
  const history: ChatMessage[] = [];
  const results: TurnOutput[] = [];
  const orders: ChatOrderRequest[] = [];
  let state: ConversationState = {};
  const senderId = randomUUID();
  try {
    for (const text of texts) {
      const ctx = baseContext(options.locale || "mn");
      ctx.settings.chatOrdersEnabled = options.chatOrders ?? true;
      const result = await runCustomerTurn({
        text, history, state, context: ctx, senderId, askUnderstanding: null, askReply: null,
        orderLookup: async () => null,
        placeOrder: options.placeOrder === null ? null : options.placeOrder || (async (request) => { orders.push(request); return { orderNumber: `T-${orders.length}`, totalPrice: request.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) + ctx.deliveryFee, deliveryFee: ctx.deliveryFee, status: "WAITING_PAYMENT", paymentMethod: "BANK" }; }),
      });
      results.push(result); state = result.state;
      history.push({ role: "user", text }, { role: "assistant", text: result.text });
    }
  } finally { setStateAdapter(null); }
  return { results, orders, state };
}

test("purchase intent is read in Cyrillic, Latin and English", () => {
  for (const text of ["Нэгийг авъя", "serum avya", "сэрум захиалъя", "odo hudaldaj away", "I want to buy it", "order it", "захиалга өгье", "zahialga ugye"]) {
    assert.ok(BUY_INTENT.test(intentProbe(text)), `should read purchase intent: ${text}`);
  }
  for (const text of ["Яаж захиалах вэ?", "Захиалга EV00001 хаана явна", "my order hasn't arrived", "үнэ хэд вэ"]) {
    assert.equal(BUY_INTENT.test(intentProbe(text)), false, `must not read purchase intent: ${text}`);
  }
});

test("asking about picking an order up is not a purchase", async () => {
  for (const text of ["Очиж авч болох уу?", "ochij avch boloh uu", "Can I pick it up?"]) assert.ok(PICKUP_QUESTION.test(intentProbe(text)), text);
  assert.equal(PICKUP_QUESTION.test(intentProbe("Нэгийг авъя")), false);
  const { results } = await conversation(["Test Serum A үнэ хэд вэ", "Очиж авч болох уу?"]);
  assert.doesNotMatch(results[1].text, /\/buy\//);
});

test("quantities, phones, districts and khoroos are parsed from free text", () => {
  assert.equal(parseQuantity("сэрум 2 ширхэг авъя"), 2);
  assert.equal(parseQuantity("биш 3 ширхэг"), 3);
  assert.equal(parseQuantity("хоёр ширхэг"), 2);
  assert.equal(parseQuantity("2-ыг авъя"), 2);
  assert.equal(parseQuantity("x3"), 3);
  assert.equal(parseQuantity("авъя"), null);
  assert.equal(parsePhone("Бат 99000000"), "99000000");
  assert.equal(parsePhone("+976 9900 0000"), "99000000");
  assert.equal(parsePhone("Бат 1234"), null);
  assert.deepEqual(parseDistrict("Баянзүрх дүүрэг 5-р хороо 12-р байр"), { zone: "UB", city: "Улаанбаатар", district: "Баянзүрх" });
  assert.deepEqual(parseDistrict("han-uul 3 horoo"), { zone: "UB", city: "Улаанбаатар", district: "Хан-Уул" });
  assert.equal(parseDistrict("Дархан-Уул аймаг Дархан сум 2-р баг")?.zone, "RURAL");
  assert.equal(parseDistrict("12-р байр 34 тоот"), null);
  assert.equal(parseKhoroo("Баянзүрх дүүрэг 5-р хороо"), "5");
  assert.equal(parseKhoroo("хороо 12"), "12");
  assert.ok(YES.test("тийм") && YES.test("Тийм, баталгаажуулъя") && YES.test("yes") && YES.test("за"));
  assert.ok(NO.test("үгүй") && NO.test("үгүй болино") && NO.test("cancel"));
  assert.equal(YES.test("тийм, хүргэлт хэд вэ"), false);
});

test("the longest shade label wins and a numbered pick selects a variant", () => {
  const pencil = products[1];
  assert.equal(matchVariant("Test Brown B байна уу", pencil)?.label, "Test Brown B");
  assert.equal(matchVariant("2", pencil, true)?.label, "Test Brown C");
  assert.equal(matchVariant("2", pencil, false), null);
});

test("the checkout link carries the product, the shade and the quantity", () => {
  const ctx = baseContext("mn");
  assert.equal(buyLink(products[1], "Test Brown B", 2, ctx), "https://shop.example.invalid/mn/buy/test-pencil-b?size=Test+Brown+B&qty=2");
  assert.equal(buyLink(products[0], null, 1, ctx), "https://shop.example.invalid/mn/buy/test-serum-a");
});

test("a confirmed chat order is created once, with the server-computed total, and never without 'yes'", async () => {
  const { results, orders } = await conversation(["Test Serum A авъя", "энд захиалъя", "Бат 99000000", "Баянзүрх дүүрэг 5-р хороо 12-р байр 34 тоот", "хүргэлт хэд вэ", "тийм", "тийм"]);
  assert.match(results[0].text, /\/buy\/test-serum-a/);
  assert.match(results[1].text, /нэр|утас/i);
  assert.match(results[2].text, /хаяг/i);
  assert.match(results[3].text, /Баталгаажуулах/);
  assert.match(results[3].text, /1,100₮/); // 1,000 + 100 delivery
  assert.match(results[4].text, /100₮/); // a question mid-flow is still answered, without creating anything
  assert.doesNotMatch(results[4].text, /T-1/);
  assert.match(results[5].text, /T-1/);
  assert.doesNotMatch(results[5].text, /төлөгдсөн|paid/i);
  assert.equal(orders.length, 1, "exactly one order, created on the confirmation turn");
  assert.deepEqual(orders[0].items, [{ productId: "test-serum-a", productName: "Test Serum A", size: "Test Size A", quantity: 1, unitPrice: 1000 }]);
  assert.equal(orders[0].phone, "99000000");
  assert.equal(orders[0].district, "Баянзүрх");
  assert.equal(orders[0].khoroo, "5");
  assert.equal(orders.length, 1, "a second 'yes' after the order creates nothing");
  assert.equal(readDraft(results[6].state), null);
});

test("'no' cancels the draft; a sold-out shade is refused; too many units are refused", async () => {
  const cancelled = await conversation(["Test Serum A авъя", "энд захиалъя", "үгүй болино"]);
  assert.equal(cancelled.orders.length, 0);
  assert.match(cancelled.results[2].text, /цуцаллаа/);
  const soldOut = await conversation(["Test Pencil B Test Brown C авъя"]);
  assert.match(soldOut.results[0].text, /Sold out|Дууссан/);
  assert.doesNotMatch(soldOut.results[0].text, /size=Test\+Brown\+C/);
  const tooMany = await conversation(["Test Pencil B Test Brown B 100 ширхэг авъя"]);
  assert.doesNotMatch(tooMany.results[0].text, /qty=100/);
  assert.match(tooMany.results[0].text, /нөөц|ажилтан/);
});

test("with chat orders switched off, the assistant only offers the checkout link", async () => {
  const { results, orders } = await conversation(["Test Serum A авъя", "энд захиалъя"], { chatOrders: false });
  assert.match(results[0].text, /\/buy\/test-serum-a/);
  assert.doesNotMatch(results[0].text, /энд захиалъя/);
  assert.doesNotMatch(results[1].text, /нэрээ/);
  assert.equal(orders.length, 0);
});

test("a product named with purchase intent after a list, and a changed mind, both resolve", async () => {
  const { results } = await conversation(["захиалга өгье", "1", "биш, Test Balm D авъя", "2 ширхэг"]);
  assert.match(results[0].text, /1\)/);
  assert.match(results[1].text, /\/buy\/test-serum-a/);
  assert.match(results[2].text, /\/buy\/test-balm-d/);
  assert.match(results[3].text, /2 ширхэг/);
  assert.match(results[3].text, /\/buy\/test-balm-d\?[^\s]*qty=2/);
});

test("an unknown product name with purchase intent asks which product instead of guessing one", async () => {
  const { results, orders } = await conversation(["Test Unknown Z авъя"]);
  assert.doesNotMatch(results[0].text, /\/buy\//);
  assert.match(results[0].text, /Аль|1\)/);
  assert.equal(orders.length, 0);
});

test("an order service failure never claims an order exists and offers the link instead", async () => {
  const { results, state } = await conversation(["Test Serum A авъя", "энд захиалъя", "Бат 99000000", "Хан-Уул 3 хороо 7 байр", "тийм"], {
    placeOrder: async () => { throw Object.assign(new Error("DB down"), { code: "UNKNOWN" }); },
  });
  assert.doesNotMatch(results[4].text, /бүртгэгдлээ|№/);
  assert.match(results[4].text, /\/buy\/test-serum-a/);
  assert.equal(results[4].needsHuman, true);
  assert.equal(readDraft(state), null);
});
