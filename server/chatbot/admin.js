import { Router } from "express";
import { prisma } from "../utils/prisma.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { getSettings } from "./settings.js";
import { handleCustomerMessage } from "./handler.js";
import { asyncRoute, publicMessages } from "./routes.js";
import { chatError, hash, newToken, rateLimit } from "./security.js";
import { unsafeClaim } from "./reply.js";

export const adminChatRouter = Router();
let metaSender;
export const registerMetaSender = (send) => { metaSender = send; };
adminChatRouter.use(requireAdmin);
adminChatRouter.use((req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
const strings = ["greetingMn", "greetingEn", "handoffMn", "handoffEn", "extraKnowledgeMn", "extraKnowledgeEn"];
adminChatRouter.get("/settings", asyncRoute(async (req, res) => res.json(await getSettings())));
adminChatRouter.patch("/settings", asyncRoute(async (req, res) => {
  const data = {};
  for (const field of ["enabled", "metaOutbound", "showExactStock"]) if (field in req.body) {
    if (typeof req.body[field] !== "boolean") throw chatError("INVALID_SETTING", 400);
    data[field] = req.body[field];
  }
  if ("lowStockThreshold" in req.body) {
    const n = req.body.lowStockThreshold;
    if (!Number.isInteger(n) || n < 1 || n > 1000) throw chatError("INVALID_THRESHOLD", 400);
    data.lowStockThreshold = n;
  }
  for (const field of strings) if (field in req.body) {
    const text = req.body[field];
    if (typeof text !== "string" || text.length > (field.startsWith("extra") ? 8000 : 1000) || (!field.startsWith("extra") && !text.trim()) || unsafeClaim(text)) throw chatError("INVALID_COPY", 400);
    if (/₮|\bMNT\b|exact stock|нөөц.*\d|\d.*нөөц/i.test(text)) throw chatError("USE_CATALOGUE_FOR_FACTS", 400);
    data[field] = text.trim();
  }
  res.json(await prisma.chatSettings.upsert({ where: { id: "default" }, create: { id: "default", ...data }, update: data }));
}));
adminChatRouter.get("/conversations", asyncRoute(async (req, res) => {
  const page = Math.max(1, Math.min(10000, Number.parseInt(req.query.page, 10) || 1));
  const where = { channel: { not: "test" } };
  const [rows, total] = await Promise.all([
    prisma.chatConversation.findMany({ where, orderBy: { updatedAt: "desc" }, take: 30, skip: (page - 1) * 30,
      select: { id: true, channel: true, locale: true, paused: true, needsHuman: true, unread: true, updatedAt: true, messages: { orderBy: { createdAt: "desc" }, take: 1, select: { text: true, role: true } } } }),
    prisma.chatConversation.count({ where }),
  ]);
  res.json({ rows, total, page });
}));
adminChatRouter.get("/conversations/:id", asyncRoute(async (req, res) => {
  const c = await prisma.chatConversation.findUnique({ where: { id: req.params.id }, select: { id: true, channel: true, paused: true, needsHuman: true, locale: true } });
  if (!c) throw chatError("NOT_FOUND", 404);
  const [messages] = await Promise.all([publicMessages(c.id), prisma.chatConversation.update({ where: { id: c.id }, data: { unread: 0 } })]);
  res.json({ ...c, messages });
}));
adminChatRouter.patch("/conversations/:id", asyncRoute(async (req, res) => {
  if (typeof req.body.paused !== "boolean") throw chatError("INVALID_TAKEOVER", 400);
  const c = await prisma.chatConversation.findUnique({ where: { id: req.params.id } });
  if (!c) throw chatError("NOT_FOUND", 404);
  const state = { ...c.state, humanTakeoverAt: req.body.paused ? new Date().toISOString() : "" };
  await prisma.chatConversation.update({ where: { id: c.id }, data: { paused: req.body.paused, needsHuman: req.body.paused, unread: 0, state } });
  res.json({ paused: req.body.paused });
}));
adminChatRouter.post("/conversations/:id/messages", asyncRoute(async (req, res) => {
  await rateLimit(`admin-reply:${req.user.id}`, 30);
  const text = req.body.text?.trim();
  const id = req.body.clientMessageId;
  if (typeof text !== "string" || !text || text.length > 2000 || typeof id !== "string" || !/^[\w:.-]{1,100}$/.test(id)) throw chatError("INVALID_MESSAGE", 400);
  const c = await prisma.chatConversation.findUnique({ where: { id: req.params.id } });
  if (!c) throw chatError("NOT_FOUND", 404);
  const message = await prisma.$transaction(async (tx) => {
    await tx.chatConversation.update({ where: { id: c.id }, data: { paused: true, needsHuman: true, unread: 0, state: { ...c.state, humanTakeoverAt: new Date().toISOString() } } });
    return tx.chatMessage.upsert({ where: { conversationId_clientMessageId: { conversationId: c.id, clientMessageId: `human:${id}` } }, create: { conversationId: c.id, role: "human", text, clientMessageId: `human:${id}` }, update: {} });
  });
  if (["messenger", "instagram"].includes(c.channel)) {
    if (!metaSender) throw chatError("META_DISABLED", 503);
    await metaSender(c, message, { human: true });
  }
  res.json(message);
}));
adminChatRouter.get("/leads", asyncRoute(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const where = { conversation: { channel: { not: "test" } } };
  const [rows, total] = await Promise.all([prisma.chatLead.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * 50, take: 50 }), prisma.chatLead.count({ where })]);
  res.json({ rows, total });
}));
adminChatRouter.patch("/leads/:id", asyncRoute(async (req, res) => {
  if (!["new", "contacted", "done"].includes(req.body.status)) throw chatError("INVALID_STATUS", 400);
  res.json(await prisma.chatLead.update({ where: { id: req.params.id }, data: { status: req.body.status } }));
}));
adminChatRouter.get("/errors", asyncRoute(async (req, res) => res.json(await prisma.chatErrorLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 }))));
adminChatRouter.post("/test", asyncRoute(async (req, res) => {
  await rateLimit(`admin-test:${req.user.id}`, 30);
  let conversation;
  if (req.body.conversationId) conversation = await prisma.chatConversation.findFirst({ where: { id: req.body.conversationId, channel: "test" } });
  if (!conversation && req.body.conversationId) throw chatError("NOT_FOUND", 404);
  if (!conversation) conversation = await prisma.chatConversation.create({ data: { channel: "test", tokenHash: hash(newToken()), state: { adminId: req.user.id }, locale: req.body.locale === "en" ? "en" : "mn" } });
  // Test ownership uses state: one admin can have multiple independent test sessions.
  if (conversation.state?.adminId !== req.user.id) throw chatError("NOT_FOUND", 404);
  const result = await handleCustomerMessage({ conversationId: conversation.id, text: req.body.text, clientMessageId: req.body.clientMessageId });
  res.json({ ...result, messages: await publicMessages(conversation.id) });
}));
adminChatRouter.delete("/test/:id", asyncRoute(async (req, res) => {
  const c = await prisma.chatConversation.findUnique({ where: { id: req.params.id } });
  if (!c || c.channel !== "test" || c.state?.adminId !== req.user.id) throw chatError("NOT_FOUND", 404);
  await prisma.chatErrorLog.deleteMany({ where: { conversationId: c.id } });
  await prisma.chatConversation.delete({ where: { id: c.id } });
  res.status(204).end();
}));
