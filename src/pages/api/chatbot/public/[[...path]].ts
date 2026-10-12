import { apiRoute, authorizePublic, deleteTestConversation, first, limitRequest, publicMessages, qaAuthorized } from "../../../../chatbot/api";
import { prisma } from "../../../../chatbot/prisma";
import { getSettings } from "../../../../chatbot/settings.js";
import { handleCustomerMessage } from "../../../../chatbot/handler";
import { chatError, hash, newToken } from "../../../../chatbot/security.js";
import { STORE } from "../../../../config/store-data.mjs";

export const config = { api: { bodyParser: { sizeLimit: "64kb" } }, maxDuration: 30 };
export default apiRoute(async (req, res) => {
  const paths = req.query.path as string[] | undefined;
  const [kind, id, action] = paths || [];
  if (kind === "config" && req.method === "GET") {
    await limitRequest(req, "config", 120);
    const s = await getSettings();
    return res.json({ enabled: s.enabled, greetingMn: s.greetingMn, greetingEn: s.greetingEn, contact: STORE.contact });
  }
  if (kind !== "conversations") return res.status(404).end();
  if (!id && req.method === "POST") {
    await limitRequest(req, "create", qaAuthorized(req) ? 500 : 10, 60 * 60_000);
    const locale = req.body?.locale === "en" ? "en" : "mn";
    const token = newToken();
    const s = await getSettings();
    const c = await prisma.chatConversation.create({ data: { channel: qaAuthorized(req) ? "test" : "website", tokenHash: hash(token), locale, ...(s.enabled ? { messages: { create: { role: "assistant", text: locale === "en" ? s.greetingEn : s.greetingMn } } } : {}) } });
    return res.status(201).json({ conversationId: c.id, token, paused: !s.enabled, messages: await publicMessages(c.id) });
  }
  if (!id) return res.status(405).end();
  const c = await authorizePublic(req, id);
  if (!action && req.method === "GET") {
    await limitRequest(req, "poll", 120);
    const s = await getSettings();
    return res.json({ conversationId: c.id, paused: c.paused || !s.enabled, messages: await publicMessages(c.id) });
  }
  if (!action && req.method === "DELETE" && c.channel === "test" && qaAuthorized(req)) { await deleteTestConversation(c.id); return res.status(204).end(); }
  if (action === "messages" && req.method === "POST") {
    await limitRequest(req, "message", qaAuthorized(req) ? 1000 : 40);
    if (typeof req.body?.text !== "string" || typeof req.body?.clientMessageId !== "string") throw chatError("INVALID_MESSAGE", 400);
    const result = await handleCustomerMessage({ conversationId: c.id, text: req.body.text, clientMessageId: first(req.body.clientMessageId) });
    return res.json({ ...result, messages: await publicMessages(c.id) });
  }
  return res.status(405).end();
});
