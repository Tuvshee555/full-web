import test from "node:test";
import assert from "node:assert/strict";
import { shouldAutoResume } from "../../src/chatbot/handler";
import { estimateCostUsd, usageDay, withinBudget } from "../../src/chatbot/aiUsage";
import { parseSettingsFields } from "../../src/chatbot/settingsFields";
import { summarizeAssistantMessages, summarizeUsage } from "../../src/chatbot/analytics";
import { runFlow } from "./helpers/flow";

test("a taken-over chat goes back to the assistant only after the owner's silence limit", () => {
  const now = Date.parse("2026-11-01T12:00:00Z");
  const lastHumanAt = new Date("2026-10-31T10:00:00Z");
  assert.equal(shouldAutoResume({ paused: true, hours: 24, lastHumanAt, now }), true);
  assert.equal(shouldAutoResume({ paused: true, hours: 48, lastHumanAt, now }), false);
  assert.equal(shouldAutoResume({ paused: true, hours: 0, lastHumanAt, now }), false);
  assert.equal(shouldAutoResume({ paused: false, hours: 1, lastHumanAt, now }), false);
  assert.equal(shouldAutoResume({ paused: true, hours: 1, lastHumanAt: null, humanTakeoverAt: "2026-11-01T09:00:00Z", now }), true);
  assert.equal(shouldAutoResume({ paused: true, hours: 1, lastHumanAt: null, humanTakeoverAt: null, now }), false);
});

test("hand-offs carry a reason and the conversation context for staff", async () => {
  const [complaint] = await runFlow(["Бүтээгдэхүүн гэмтэлтэй ирсэн"], "mn");
  assert.equal(complaint.needsHuman, true);
  assert.equal(complaint.handoffReason, "complaint");
  const [, payment] = await runFlow(["Test Serum A үнэ хэд вэ", "Мөнгөө шилжүүлсэн"], "mn");
  assert.equal(payment.handoffReason, "payment_claim");
  assert.match(payment.leadContext || "", /Test Serum A/);
  assert.match(payment.leadContext || "", /Мөнгөө шилжүүлсэн/);
  const [reaction] = await runFlow(["нүд улайгаад байна"], "mn");
  assert.equal(reaction.needsHuman, true);
  assert.equal(reaction.handoffReason, "medical");
  assert.match(reaction.text, /зогсоо|эмч/);
  const [question] = await runFlow(["Жирэмсэн хүн хэрэглэж болох уу?"], "mn");
  assert.equal(question.needsHuman, false);
  assert.match(question.text, /эмч/);
});

test("model spend is estimated per model and the daily budget stops the model, never the assistant", () => {
  assert.equal(estimateCostUsd("gpt-4.1-mini", { prompt_tokens: 1_000_000, completion_tokens: 0 }), 0.4);
  assert.equal(estimateCostUsd("gpt-4.1-2025-04-14", { prompt_tokens: 500_000, completion_tokens: 125_000 }), 2);
  assert.equal(estimateCostUsd("unknown-model", { prompt_tokens: 10, completion_tokens: 10 }), null);
  assert.equal(withinBudget(4.99, 5), true);
  assert.equal(withinBudget(5, 5), false);
  assert.equal(withinBudget(100, 0), true);
  assert.equal(withinBudget(100, undefined), true);
  assert.equal(usageDay(new Date("2026-11-01T20:30:00Z")).toISOString(), "2026-11-02T00:00:00.000Z"); // 04:30 the next day in Ulaanbaatar
});

test("the new settings are validated and the model is limited to the allow-list", () => {
  const data = parseSettingsFields({ chatOrdersEnabled: false, handoverAutoResumeHours: 12, aiDailyBudgetUsd: 2.5, aiModel: "gpt-4.1-mini" });
  assert.deepEqual(data, { chatOrdersEnabled: false, handoverAutoResumeHours: 12, aiDailyBudgetUsd: 2.5, aiModel: "gpt-4.1-mini" });
  assert.throws(() => parseSettingsFields({ aiModel: "gpt-99" }), /invalid model/);
  assert.throws(() => parseSettingsFields({ handoverAutoResumeHours: 10000 }), /invalid hours/);
  assert.throws(() => parseSettingsFields({ aiDailyBudgetUsd: -1 }), /invalid budget/);
  assert.throws(() => parseSettingsFields({ chatOrdersEnabled: "yes" }), /invalid setting/);
});

test("activity counts come from the reply metadata and usage rows", () => {
  const at = new Date();
  const rows = [
    { createdAt: at, conversationId: "c1", clientMessageId: "reply:m1", metadata: { intent: "purchase", model: "rules", durationMs: 100, events: ["purchase_intent", "checkout_link"] } },
    { createdAt: at, conversationId: "c1", clientMessageId: "reply:m2", metadata: { intent: "chat_order_created", model: "rules", durationMs: 300, events: ["chat_order_created"] } },
    { createdAt: at, conversationId: "c2", clientMessageId: "reply:m3", metadata: { intent: "human", model: "rules", durationMs: 50, handoff: true, handoffReason: "complaint", events: [] } },
    { createdAt: at, conversationId: "c3", clientMessageId: "reply:m4", metadata: { intent: "product", model: "writer", aiModel: "gpt-4.1", durationMs: 2000, events: ["unpublished_fact:usage"] } },
    { createdAt: at, conversationId: "c4", clientMessageId: "reply:m5", metadata: { intent: "smalltalk", model: "rules", durationMs: 20, events: ["unanswered"] } },
  ];
  const summary = summarizeAssistantMessages(rows);
  assert.equal(summary.purchaseIntent, 1);
  assert.equal(summary.checkoutLinks, 1);
  assert.equal(summary.chatOrdersCreated, 1);
  assert.equal(summary.handovers, 1);
  assert.deepEqual(summary.handoversByReason, { complaint: 1 });
  assert.equal(summary.unanswered, 2);
  assert.deepEqual(summary.unpublishedFacts, { usage: 1 });
  assert.deepEqual(summary.models, { rules: 4, "writer:gpt-4.1": 1 });
  assert.equal(summary.avgDurationMs, 494);
  assert.equal(summary.unansweredReplies[0].customerClientMessageId, "m4");
  const usage = summarizeUsage([{ day: "2026-11-01", model: "gpt-4.1", calls: 2, promptTokens: 1000, completionTokens: 100, estCostUsd: 0.0028 }, { day: "2026-11-02", model: "gpt-4.1", calls: 1, promptTokens: 500, completionTokens: 50, estCostUsd: 0.0014 }]);
  assert.equal(usage.calls, 3);
  assert.equal(usage.estCostUsd, 0.0042);
  assert.equal(usage.byModel[0].model, "gpt-4.1");
  assert.deepEqual(usage.byDay.map((day) => day.day), ["2026-11-01", "2026-11-02"]);
});
