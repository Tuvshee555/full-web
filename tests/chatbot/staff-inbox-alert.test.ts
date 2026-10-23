import test from "node:test";
import assert from "node:assert/strict";
import { buildAlertText, shouldAlertWaitingMessage, WAITING_ALERT_GAP_MS } from "../../src/chatbot/staffAlerts";

test("the owner is alerted for the first message and again only after a quiet gap", () => {
  const now = Date.parse("2099-01-01T12:00:00Z");
  assert.equal(shouldAlertWaitingMessage(null, now), true);
  assert.equal(shouldAlertWaitingMessage(undefined, now), true);
  assert.equal(shouldAlertWaitingMessage(new Date(now - 60_000), now), false);
  assert.equal(shouldAlertWaitingMessage(new Date(now - WAITING_ALERT_GAP_MS + 1), now), false);
  assert.equal(shouldAlertWaitingMessage(new Date(now - WAITING_ALERT_GAP_MS), now), true);
  assert.equal(shouldAlertWaitingMessage(new Date(now - 3 * 60 * 60_000), now), true);
});

test("a waiting-message alert says who wrote, what, and links to the admin chat", () => {
  const text = buildAlertText({ kind: "inbox", platform: "messenger", customerMessage: "Сэрум хэд вэ?", contactPhone: "99112233" });
  assert.match(text, /Шинэ мессеж/);
  assert.match(text, /Facebook/);
  assert.match(text, /Сэрум хэд вэ\?/);
  assert.match(text, /99112233/);
  assert.match(text, /\/admin\/mn\/home-page\?view=chatbot/);
});

test("a handoff alert keeps its own wording", () => {
  const text = buildAlertText({ kind: "handoff", platform: "website", customerMessage: "Хүнтэй ярья" });
  assert.match(text, /хүнтэй ярихыг хүсэв/);
  assert.match(text, /Website/);
  assert.doesNotMatch(text, /view=chatbot/);
});
