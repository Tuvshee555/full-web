import { apiRoute, first, limitRequest, publicMessages } from "../../../../../chatbot/api";
import { requireAdminAccess } from "../../../../../chatbot/adminAccess";
import { prisma } from "../../../../../chatbot/prisma";
import { pauseBot, resumeBot } from "../../../../../chatbot/pause";
import { sendMetaMessage } from "../../../../../chatbot/metaDelivery";
import { chatError } from "../../../../../chatbot/security.js";

export const config = { api: { bodyParser: { sizeLimit: "64kb" } }, maxDuration: 30 };
export default apiRoute(async (req, res) => {
  if (!(await requireAdminAccess(req, res, "api.chatbot.admin.conversations"))) return;
  const [id, action] = (req.query.path as string[]) || [];
  if (!id && req.method === "GET") {
    const page = Math.max(1, Math.min(10000, Number(first(req.query.page)) || 1));
    const where = { channel: { not: "test" } };
    const [rows, total] = await Promise.all([prisma.chatConversation.findMany({ where, orderBy: { updatedAt: "desc" }, take: 30, skip: (page - 1) * 30, select: { id: true, channel: true, locale: true, paused: true, needsHuman: true, unread: true, updatedAt: true, messages: { orderBy: { createdAt: "desc" }, take: 1, select: { text: true, role: true } } } }), prisma.chatConversation.count({ where })]);
    return res.json({ rows, total, page });
  }
  if (!id) return res.status(405).end();
  const c = await prisma.chatConversation.findUnique({ where: { id } });
  if (!c) throw chatError("NOT_FOUND", 404);
  if (!action && req.method === "GET") {
    const [messages] = await Promise.all([publicMessages(id), prisma.chatConversation.update({ where: { id }, data: { unread: 0 } })]);
    return res.json({ id, channel: c.channel, paused: c.paused, needsHuman: c.needsHuman, locale: c.locale, messages });
  }
  if (!action && req.method === "PATCH") {
    if (typeof req.body?.paused !== "boolean") throw chatError("INVALID_TAKEOVER", 400);
    if (req.body.paused) await pauseBot(id); else await resumeBot(id);
    return res.json({ paused: req.body.paused });
  }
  if (action === "messages" && req.method === "POST") {
    await limitRequest(req, "admin-reply", 30);
    const text = req.body?.text;
    const receipt = req.body?.clientMessageId;
    if (typeof text !== "string" || !text.trim() || text.length > 2000 || typeof receipt !== "string" || !/^[\w:.-]{1,100}$/.test(receipt)) throw chatError("INVALID_MESSAGE", 400);
    await pauseBot(id);
    const message = await prisma.chatMessage.upsert({ where: { conversationId_clientMessageId: { conversationId: id, clientMessageId: `human:${receipt}` } }, create: { conversationId: id, role: "human", text: text.trim(), clientMessageId: `human:${receipt}` }, update: {} });
    if (["messenger", "instagram"].includes(c.channel)) await sendMetaMessage(c, message, { human: true });
    return res.json(message);
  }
  return res.status(405).end();
});
