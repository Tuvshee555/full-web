import { apiRoute, first, limitRequest, publicMessages } from "../../../../../chatbot/api";
import { requireAdminAccess } from "../../../../../chatbot/adminAccess";
import { prisma } from "../../../../../chatbot/prisma";
import { pauseBot, resumeBot } from "../../../../../chatbot/pause";
import { sendMetaMessage } from "../../../../../chatbot/metaDelivery";
import { chatError } from "../../../../../chatbot/security.js";
import { actorOf, recordAudit } from "../../../../../../server/utils/audit.js";

export const config = { api: { bodyParser: { sizeLimit: "64kb" } }, maxDuration: 30 };
const LIST_SELECT = { id: true, channel: true, locale: true, paused: true, needsHuman: true, unread: true, updatedAt: true, customerName: true, customerPhone: true, handoffReason: true, handoffAt: true, lastHumanAt: true, messages: { orderBy: { createdAt: "desc" as const }, take: 1, select: { text: true, role: true } } };

export default apiRoute(async (req, res) => {
  if (!(await requireAdminAccess(req, res, "api.chatbot.admin.conversations"))) return;
  const [id, action] = (req.query.path as string[]) || [];
  if (!id && req.method === "GET") {
    const page = Math.max(1, Math.min(10000, Number(first(req.query.page)) || 1));
    const q = first(req.query.q).trim().slice(0, 60);
    const filter = first(req.query.filter);
    // Search by the customer's name or phone (both are set when they say who they are), or a chat id.
    const search = q ? { OR: [{ customerName: { contains: q, mode: "insensitive" as const } }, { customerPhone: { contains: q.replace(/\D/g, "") || q } }, { id: { contains: q } }] } : {};
    const scope = filter === "attention" ? { OR: [{ unread: { gt: 0 } }, { needsHuman: true, paused: false }] } : filter === "taken" ? { paused: true } : {};
    const where = { channel: { not: "test" }, ...search, ...scope };
    const [rows, total] = await Promise.all([prisma.chatConversation.findMany({ where, orderBy: { updatedAt: "desc" }, take: 30, skip: (page - 1) * 30, select: LIST_SELECT }), prisma.chatConversation.count({ where })]);
    return res.json({ rows, total, page });
  }
  if (!id) return res.status(405).end();
  const c = await prisma.chatConversation.findUnique({ where: { id } });
  if (!c) throw chatError("NOT_FOUND", 404);
  if (!action && req.method === "GET") {
    const [messages, lead] = await Promise.all([
      publicMessages(id),
      prisma.chatLead.findFirst({ where: { conversationId: id }, orderBy: { createdAt: "desc" }, select: { id: true, status: true, reason: true, context: true, name: true, phone: true, createdAt: true } }),
      prisma.chatConversation.update({ where: { id }, data: { unread: 0 } }),
    ]);
    return res.json({ id, channel: c.channel, paused: c.paused, needsHuman: c.needsHuman, locale: c.locale, customerName: c.customerName, customerPhone: c.customerPhone, notes: c.notes, handoffReason: c.handoffReason, handoffAt: c.handoffAt, lastHumanAt: c.lastHumanAt, botReleasedAt: c.botReleasedAt, lead, messages });
  }
  if (!action && req.method === "PATCH") {
    const body = req.body || {};
    if (typeof body.notes === "string") {
      if (body.notes.length > 4000) throw chatError("INVALID_NOTES", 400);
      await prisma.chatConversation.update({ where: { id }, data: { notes: body.notes.trim() } });
      recordAudit({ actor: await actorOf(req.user), action: "conversation_notes", target: id, details: { length: body.notes.trim().length } });
      if (typeof body.paused !== "boolean") return res.json({ notes: body.notes.trim() });
    }
    if (typeof body.paused !== "boolean") throw chatError("INVALID_TAKEOVER", 400);
    if (body.paused) await pauseBot(id); else await resumeBot(id);
    recordAudit({ actor: await actorOf(req.user), action: body.paused ? "conversation_taken_over" : "conversation_handed_back", target: id, details: { channel: c.channel, handoffReason: c.handoffReason } });
    return res.json({ paused: body.paused });
  }
  if (action === "messages" && req.method === "POST") {
    await limitRequest(req, "admin-reply", 30);
    const text = req.body?.text;
    const receipt = req.body?.clientMessageId;
    if (typeof text !== "string" || !text.trim() || text.length > 2000 || typeof receipt !== "string" || !/^[\w:.-]{1,100}$/.test(receipt)) throw chatError("INVALID_MESSAGE", 400);
    await pauseBot(id);
    const message = await prisma.chatMessage.upsert({ where: { conversationId_clientMessageId: { conversationId: id, clientMessageId: `human:${receipt}` } }, create: { conversationId: id, role: "human", text: text.trim(), clientMessageId: `human:${receipt}` }, update: {} });
    // A person is answering now: the automatic hand-back timer starts from this reply.
    await prisma.chatConversation.update({ where: { id }, data: { lastHumanAt: new Date(), unread: 0 } });
    if (!c.paused) recordAudit({ actor: await actorOf(req.user), action: "conversation_taken_over", target: id, details: { channel: c.channel, by: "reply" } });
    if (["messenger", "instagram"].includes(c.channel)) await sendMetaMessage(c, message, { human: true });
    return res.json(message);
  }
  return res.status(405).end();
});
