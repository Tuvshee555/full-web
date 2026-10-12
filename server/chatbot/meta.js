import { Router } from "express";
import { createHmac } from "node:crypto";
import { prisma } from "../utils/prisma.js";
import { getSettings } from "./settings.js";
import { handleCustomerMessage } from "./handler.js";
import { hash, newToken, equalSecret, logError, rateLimit, chatError } from "./security.js";
import { asyncRoute } from "./routes.js";

export const metaConfigured = () => Boolean(process.env.META_PAGE_ACCESS_TOKEN && process.env.META_APP_SECRET && process.env.META_VERIFY_TOKEN);
export function verifyMetaSignature(raw, signature, secret) {
  return Boolean(secret && Buffer.isBuffer(raw) && typeof signature === "string" && /^sha256=[a-f0-9]{64}$/.test(signature)
    && equalSecret(signature, `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`));
}
export function parseMetaEvents(body, channel) {
  if (body?.object !== (channel === "instagram" ? "instagram" : "page")) throw chatError("INVALID_META_OBJECT", 400);
  const events = [];
  for (const entry of body.entry || []) for (const event of entry.messaging || []) {
    if (event.message?.is_echo || !event.message || !event.message.mid) continue;
    const sender = event.sender?.id;
    const page = event.recipient?.id || entry.id;
    if (!/^\d{1,40}$/.test(sender || "") || !/^\d{1,40}$/.test(page || "")) continue;
    const text = event.message.text || "Ажилтантай холбогдоно уу. Мессежийн хавсралтыг шалгана уу.";
    if (typeof text !== "string" || text.length > 2000 || typeof event.message.mid !== "string" || event.message.mid.length > 160) throw chatError("INVALID_META_MESSAGE", 400);
    events.push({ id: hash(`${channel}:${page}:${event.message.mid}`), mid: event.message.mid, text, sender, page, channel });
  }
  // Bound parallel provider work within Vercel's 30-second lifecycle.
  if (events.length > 10) throw chatError("META_BATCH_TOO_LARGE", 503);
  return events;
}

export async function sendMetaMessage(conversation, message, { human = false } = {}) {
  if (message.deliveryStatus === "sent") return "sent";
  const settings = await getSettings();
  const current = await prisma.chatConversation.findUniqueOrThrow({ where: { id: conversation.id } });
  if (!metaConfigured() || !settings.metaOutbound || (!human && (!settings.enabled || (current.paused && !message.metadata?.handoff)))) {
    await prisma.chatMessage.update({ where: { id: message.id }, data: { deliveryStatus: "suppressed" } });
    return "suppressed";
  }
  const { metaRecipient, metaPage } = current.state || {};
  if (!/^\d{1,40}$/.test(metaRecipient || "") || !/^\d{1,40}$/.test(metaPage || "")) throw chatError("META_RECIPIENT_MISSING");
  // Atomic claim prevents concurrent webhook retries or repeated admin POSTs sending twice.
  const claim = await prisma.chatMessage.updateMany({ where: { id: message.id, deliveryStatus: { in: ["local", "failed", "suppressed"] } }, data: { deliveryStatus: "sending" } });
  if (!claim.count) return "sending";
  const version = process.env.META_GRAPH_VERSION || "v23.0";
  if (!/^v\d+\.\d+$/.test(version)) throw chatError("META_INVALID_VERSION");
  const endpoint = `https://graph.facebook.com/${version}/${current.channel === "instagram" ? metaPage : "me"}/messages`;
  try {
    // Page-token Instagram integration uses the linked professional-account ID from the signed webhook.
    const response = await fetch(endpoint, { method: "POST", signal: AbortSignal.timeout(6000), headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.META_PAGE_ACCESS_TOKEN}` },
      body: JSON.stringify({ recipient: { id: metaRecipient }, message: { text: message.text }, ...(current.channel === "messenger" ? { messaging_type: "RESPONSE" } : {}) }) });
    if (!response.ok) {
      await prisma.chatMessage.update({ where: { id: message.id }, data: { deliveryStatus: "failed" } });
      await logError(`META_HTTP_${response.status}`, "sendMetaMessage", current.id);
      return "failed";
    }
    await prisma.chatMessage.update({ where: { id: message.id }, data: { deliveryStatus: "sent" } });
    return "sent";
  } catch {
    // Ambiguous timeout may have delivered. Do not automatically resend and risk duplicate customer messages.
    await prisma.chatMessage.update({ where: { id: message.id }, data: { deliveryStatus: "uncertain" } });
    await logError("META_DELIVERY_UNCERTAIN", "sendMetaMessage", current.id);
    return "uncertain";
  }
}

async function processEvent(event, conversation) {
  const clientMessageId = `meta:${event.id}`;
  try {
    const result = await handleCustomerMessage({ conversationId: conversation.id, text: event.text, clientMessageId });
    let delivery = "suppressed";
    if (result.reply) delivery = await sendMetaMessage(conversation, result.reply);
    await prisma.chatWebhookEvent.updateMany({ where: { id: { in: event.eventIds || [event.id] } }, data: { completed: delivery !== "failed", messageId: result.reply?.id || null } });
    return delivery !== "failed";
  } catch (error) { await logError(error.code || "META_PROCESS_FAILED", "processEvent", conversation.id); return false; }
}

export const metaRouter = Router();
metaRouter.use((req, res, next) => {
  if (!metaConfigured()) return res.status(503).json({ code: "META_DISABLED" });
  next();
});
metaRouter.get("/:channel", (req, res) => {
  if (!["messenger", "instagram"].includes(req.params.channel)) return res.sendStatus(404);
  if (req.query["hub.mode"] === "subscribe" && equalSecret(req.query["hub.verify_token"], process.env.META_VERIFY_TOKEN) && typeof req.query["hub.challenge"] === "string") return res.type("text/plain").send(req.query["hub.challenge"]);
  return res.sendStatus(403);
});
metaRouter.post("/:channel", asyncRoute(async (req, res) => {
  if (!["messenger", "instagram"].includes(req.params.channel)) return res.sendStatus(404);
  if (!verifyMetaSignature(req.rawBody, req.get("X-Hub-Signature-256"), process.env.META_APP_SECRET)) return res.sendStatus(403);
  await rateLimit(`meta-ip:${req.ip}`, 120);
  const events = parseMetaEvents(req.body, req.params.channel);
  const work = [];
  for (const event of events) {
    const existing = await prisma.chatWebhookEvent.findUnique({ where: { id: event.id } });
    if (existing?.completed) continue;
    const conversation = await prisma.chatConversation.upsert({
      where: { channel_externalId: { channel: event.channel, externalId: `${event.page}:${event.sender}` } },
      create: { channel: event.channel, externalId: `${event.page}:${event.sender}`, tokenHash: hash(newToken()), state: { metaRecipient: event.sender, metaPage: event.page } }, update: {},
    });
    await prisma.chatWebhookEvent.upsert({ where: { id: event.id }, create: { id: event.id, conversationId: conversation.id }, update: {} });
    work.push({ event, conversation });
  }
  // Combine bursts from one conversation into one bounded turn. Each receipt remains deduplicated.
  const groups = new Map();
  for (const item of work) {
    const group = groups.get(item.conversation.id) || [];
    group.push(item); groups.set(item.conversation.id, group);
  }
  const jobs = [...groups.values()].map((group) => {
    const eventIds = group.map((item) => item.event.id);
    const text = group.map((item) => item.event.text).join("\n");
    if (text.length > 2000) throw chatError("META_BURST_TOO_LARGE", 503);
    return { event: { ...group[0].event, id: group.length === 1 ? group[0].event.id : hash(eventIds.join(":")), eventIds, text }, conversation: group[0].conversation };
  });
  const results = await Promise.all(jobs.map((job) => processEvent(job.event, job.conversation)));
  // Acknowledge only persisted success; retryable failures get a non-2xx response for Meta redelivery.
  if (results.some((ok) => !ok)) return res.status(503).json({ code: "META_RETRY" });
  res.status(200).json({ received: true });
}));
