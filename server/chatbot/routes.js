import { Router } from "express";
import { prisma } from "../utils/prisma.js";
import { STORE } from "../../src/config/store-data.mjs";
import { getSettings } from "./settings.js";
import { handleCustomerMessage } from "./handler.js";
import { authorizeConversation, chatError, hash, newToken, rateLimit, logError } from "./security.js";

export const publicChatRouter = Router();
export const asyncRoute = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch(async (error) => {
  const status = error.status || 503;
  if (status >= 500) await logError(error.code || "API_UNAVAILABLE", "chatRoute");
  const locale = req.body?.locale === "en" || req.query?.locale === "en" ? "en" : "mn";
  res.status(status).json({ code: error.code || "CHAT_UNAVAILABLE", message: locale === "en" ? "Chat is temporarily unavailable. Please contact our team." : "Чат түр ажиллахгүй байна. Манай ажилтантай холбогдоно уу.", contact: STORE.contact });
});
export const publicMessages = (id) => prisma.chatMessage.findMany({
  where: { conversationId: id }, orderBy: { createdAt: "desc" }, take: 100,
  select: { id: true, role: true, text: true, createdAt: true, deliveryStatus: true },
}).then((rows) => rows.reverse());

publicChatRouter.use((req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
publicChatRouter.get("/config", asyncRoute(async (req, res) => {
  await rateLimit(`config:${req.ip}`, 120);
  const s = await getSettings();
  res.json({ enabled: s.enabled, greetingMn: s.greetingMn, greetingEn: s.greetingEn, contact: STORE.contact });
}));
publicChatRouter.post("/conversations", asyncRoute(async (req, res) => {
  await rateLimit(`create:${req.ip}`, 10, 60 * 60_000);
  const locale = req.body?.locale === "en" ? "en" : "mn";
  const token = newToken();
  const settings = await getSettings();
  const conversation = await prisma.chatConversation.create({ data: { channel: "website", tokenHash: hash(token), locale,
    ...(settings.enabled ? { messages: { create: { role: "assistant", text: locale === "en" ? settings.greetingEn : settings.greetingMn } } } : {}) } });
  res.status(201).json({ conversationId: conversation.id, token, paused: !settings.enabled, messages: await publicMessages(conversation.id) });
}));
publicChatRouter.get("/conversations/:id", asyncRoute(async (req, res) => {
  await rateLimit(`poll:${req.ip}`, 120);
  const conversation = await authorizeConversation(req.params.id, req.get("X-Chat-Token"));
  const settings = await getSettings();
  res.json({ conversationId: conversation.id, paused: conversation.paused || !settings.enabled, messages: await publicMessages(conversation.id) });
}));
publicChatRouter.post("/conversations/:id/messages", asyncRoute(async (req, res) => {
  await rateLimit(`message:${req.ip}`, 40);
  await authorizeConversation(req.params.id, req.get("X-Chat-Token"));
  if (!req.body || typeof req.body.text !== "string") throw chatError("INVALID_MESSAGE", 400);
  const result = await handleCustomerMessage({ conversationId: req.params.id, text: req.body.text, clientMessageId: req.body.clientMessageId });
  res.json({ paused: result.paused, messages: await publicMessages(req.params.id) });
}));
