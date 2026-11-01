/**
 * The chat order reservation policy as the engine applies it (pure, no database): the per-item
 * cap, the reservation window in the customer's summary, the refusal when a phone already holds an
 * unpaid chat order, and the settings validation. The database side is scripts/test-chatbot-db.mjs.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { runCustomerTurn, type TurnOutput } from "../../src/chatbot/turn";
import { setStateAdapter } from "../../src/chatbot/conversationState";
import { reservationPolicy, reservationWindowText } from "../../src/chatbot/commerce/reservationPolicy";
import { parseSettingsFields } from "../../src/chatbot/settingsFields";
import { context as baseContext } from "./helpers/fixtures";
import type { ChatMessage, ChatOrderRequest, ChatOrderResult, ConversationState } from "../../src/chatbot/types";

type Place = (request: ChatOrderRequest) => Promise<ChatOrderResult>;
async function conversation(texts: string[], options: { placeOrder?: Place; settings?: Record<string, number> } = {}) {
  const states = new Map<string, ConversationState>();
  setStateAdapter({ read: async (id) => states.get(id) || {}, merge: async (id, patch) => { states.set(id, { ...states.get(id), ...patch }); } });
  const history: ChatMessage[] = [];
  const results: TurnOutput[] = [];
  const orders: ChatOrderRequest[] = [];
  let state: ConversationState = {};
  const senderId = randomUUID();
  try {
    for (const text of texts) {
      const ctx = baseContext("mn");
      ctx.settings = { ...ctx.settings, chatOrdersEnabled: true, ...(options.settings || {}) };
      const result = await runCustomerTurn({
        text, history, state, context: ctx, senderId, askUnderstanding: null, askReply: null, orderLookup: async () => null,
        placeOrder: options.placeOrder || (async (request) => { orders.push(request); return { orderNumber: `T-${orders.length}`, totalPrice: 1100, deliveryFee: 100, status: "WAITING_PAYMENT", paymentMethod: "BANK", reservationMinutes: reservationPolicy(ctx.settings).minutes }; }),
      });
      results.push(result); state = result.state;
      history.push({ role: "user", text }, { role: "assistant", text: result.text });
    }
  } finally { setStateAdapter(null); }
  return { results, orders };
}

test("the policy reads the owner's settings with the approved defaults", () => {
  assert.deepEqual(reservationPolicy(undefined), { minutes: 60, maxActivePerPhone: 1, maxQuantityPerItem: 5 });
  assert.deepEqual(reservationPolicy({ chatReservationMinutes: 90, chatMaxActiveReservationsPerPhone: 2, chatMaxQuantityPerItem: 3 }), { minutes: 90, maxActivePerPhone: 2, maxQuantityPerItem: 3 });
  assert.deepEqual(reservationPolicy({ chatReservationMinutes: 0, chatMaxActiveReservationsPerPhone: 99, chatMaxQuantityPerItem: -1 }), { minutes: 60, maxActivePerPhone: 1, maxQuantityPerItem: 5 });
  assert.equal(reservationWindowText(60, "mn"), "60 минут");
  assert.equal(reservationWindowText(120, "mn"), "2 цаг");
  assert.equal(reservationWindowText(45, "en"), "45 minutes");
  const parsed = parseSettingsFields({ chatReservationMinutes: 30, chatMaxActiveReservationsPerPhone: 1, chatMaxQuantityPerItem: 5 });
  assert.deepEqual(parsed, { chatReservationMinutes: 30, chatMaxActiveReservationsPerPhone: 1, chatMaxQuantityPerItem: 5 });
  assert.throws(() => parseSettingsFields({ chatReservationMinutes: 2 }), /invalid chatReservationMinutes/);
  assert.throws(() => parseSettingsFields({ chatMaxActiveReservationsPerPhone: 0 }), /invalid chatMaxActiveReservationsPerPhone/);
  assert.throws(() => parseSettingsFields({ chatMaxQuantityPerItem: 51 }), /invalid chatMaxQuantityPerItem/);
});

test("more units than the cap: no chat order, the website cart link with that quantity, and staff are told", async () => {
  const { results, orders } = await conversation(["Test Serum A 7 ширхэг авъя"]);
  const [reply] = results;
  assert.match(reply.text, /хамгийн ихдээ 5 ширхэг/);
  assert.match(reply.text, /\/buy\/test-serum-a\?.*qty=7/);
  assert.equal(reply.needsHuman, true);
  assert.equal(reply.handoffReason, "bulk_order");
  assert.ok(reply.events.includes("bulk_quantity"));
  assert.equal(orders.length, 0);
  // The cap is the owner's: with a cap of 10 the same request is an ordinary offer.
  const bigger = await conversation(["Test Serum A 7 ширхэг авъя"], { settings: { chatMaxQuantityPerItem: 10 } });
  assert.match(bigger.results[0].text, /7 ширхэг × 1,000₮ = 7,000₮/);
  assert.equal(bigger.results[0].needsHuman, false);
  // Raising the quantity mid-draft is capped too.
  const raised = await conversation(["Test Serum A авъя", "энд захиалъя", "Бат 99001122", "Баянгол дүүрэг 3-р хороо 5-р байр", "6 ширхэг"]);
  assert.match(raised.results[4].text, /хамгийн ихдээ 5 ширхэг/);
  assert.equal(raised.orders.length, 0);
});

test("the summary and the confirmation state the owner's reservation window", async () => {
  const { results, orders } = await conversation(["Test Serum A авъя", "энд захиалъя", "Бат 99001122", "Баянгол дүүрэг 3-р хороо 5-р байр", "тийм"], { settings: { chatReservationMinutes: 45 } });
  assert.match(results[3].text, /45 минут дотор/);
  assert.match(results[4].text, /Захиалга бүртгэгдлээ: №T-1/);
  assert.match(results[4].text, /45 минут дотор төлбөр хийгээгүй бол захиалга автоматаар цуцлагдаж/);
  assert.doesNotMatch(results[4].text, /24 цаг/);
  assert.equal(orders.length, 1);
  assert.equal(orders[0].items[0].quantity, 1);
});

test("a phone that already holds an unpaid chat order is shown that order instead of a second reservation", async () => {
  const refuse: Place = async () => { throw Object.assign(new Error("RESERVATION_LIMIT"), { code: "RESERVATION_LIMIT", extra: { orderNumber: "T-9", totalPrice: 1100, expiresAt: new Date(Date.now() + 20 * 60_000).toISOString() } }); };
  const { results } = await conversation(["Test Serum A авъя", "энд захиалъя", "Бат 99001122", "Баянгол дүүрэг 3-р хороо 5-р байр", "тийм"], { placeOrder: refuse });
  const reply = results[4];
  assert.match(reply.text, /№T-9/);
  assert.match(reply.text, /1,100₮/);
  assert.match(reply.text, /20 минутын дараа/);
  assert.match(reply.text, /0000000000/);
  assert.equal(reply.needsHuman, true);
  assert.equal(reply.handoffReason, "order_problem");
  assert.doesNotMatch(reply.text, /бүртгэгдлээ/);
  assert.equal(reply.state.orderDraft, null);
});
