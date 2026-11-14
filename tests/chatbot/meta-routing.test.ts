import assert from "node:assert/strict";
import test from "node:test";
import { metaConfigured } from "../../src/chatbot/metaDelivery";
import { parseMetaEvents, parseStaffEchoes } from "../../src/chatbot/webhookRuntime";

const PAGE = "1111111111";
const message = (page: string, sender: string, mid: string, text: string, extra: Record<string, unknown> = {}) => ({ id: page, messaging: [{ sender: { id: sender }, recipient: { id: page }, message: { mid, text, ...extra } }] });

function withPage<T>(value: string | undefined, run: () => T): T {
  const saved = process.env.META_PAGE_ID;
  if (value === undefined) delete process.env.META_PAGE_ID;
  else process.env.META_PAGE_ID = value;
  try { return run(); } finally { if (saved === undefined) delete process.env.META_PAGE_ID; else process.env.META_PAGE_ID = saved; }
}

test("the webhook stays closed without META_PAGE_ID", () => {
  withPage(undefined, () => assert.equal(metaConfigured(), false));
  withPage(PAGE, () => assert.equal(metaConfigured(), true));
});

test("only the configured Page's messages enter the bot; with no Page configured, none do", () => {
  const body = { object: "page", entry: [message(PAGE, "333", "m_1", "Сайн уу"), message("9999999999", "444", "m_2", "hi")] };
  withPage(PAGE, () => assert.deepEqual(parseMetaEvents(body).map((e) => e.senderId), ["333"]));
  withPage(undefined, () => assert.deepEqual(parseMetaEvents(body), []));
});

test("a reply typed in the Page inbox is a staff echo; the bot's own echo is not", () => {
  const echo = (mid: string, extra: Record<string, unknown>) => ({ id: PAGE, messaging: [{ sender: { id: PAGE }, recipient: { id: "333" }, message: { mid, text: "Сайн байна уу, ажилтан байна", is_echo: true, ...extra } }] });
  const body = { object: "page", entry: [echo("m_staff", { app_id: 263902037430900 }), echo("m_bot", { metadata: "lorentz-bot-message" })] };
  withPage(PAGE, () => {
    assert.deepEqual(parseStaffEchoes(body), [{ platform: "facebook", pageId: PAGE, customerId: "333", mid: "m_staff", text: "Сайн байна уу, ажилтан байна" }]);
    // Echoes never enter the bot as customer messages.
    assert.deepEqual(parseMetaEvents(body), []);
  });
  withPage("2222222222", () => assert.deepEqual(parseStaffEchoes(body), []));
});
