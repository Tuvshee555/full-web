import { prisma } from "./prisma";
import { handleCustomerMessage } from "./handler";
import { chatError, hash, newToken } from "./security.js";
import { sendMetaMessage } from "./metaDelivery";
import { buildEventKey, enqueuePendingConversationConsistent, MAX_INCOMING_TEXT_CHARS, runEventWithClaim, RetryableWebhookError, type PendingConversationPayload } from "./webhookDedup";

export type IncomingMetaEvent = PendingConversationPayload & { eventKey: string; mid: string };
/** A message the Page itself sent that the bot did not write: a person answering from the Page inbox. */
export type StaffEcho = { platform: "facebook" | "instagram"; pageId: string; customerId: string; mid: string; text: string };
type MetaEvent = { sender?: { id?: string }; recipient?: { id?: string }; message?: { mid?: string; text?: string; is_echo?: boolean; metadata?: string; app_id?: number | string; attachments?: unknown[] }; postback?: { mid?: string; payload?: string } };

// Only this store's own Page and Instagram account; with neither configured nothing is accepted.
function allowedAccount(...ids: string[]) {
  const allowed = [process.env.META_PAGE_ID, process.env.META_INSTAGRAM_ID].filter((id): id is string => Boolean(id));
  return ids.some((id) => id && allowed.includes(id));
}
type MetaBody = { object?: string; entry?: Array<{ id?: string; messaging?: MetaEvent[] }> };

export function parseMetaEvents(input: unknown): IncomingMetaEvent[] {
  if (!input || typeof input !== "object") throw chatError("INVALID_META_OBJECT", 400);
  const body = input as MetaBody;
  if (body.object !== "page" && body.object !== "instagram") throw chatError("INVALID_META_OBJECT", 400);
  if (!Array.isArray(body.entry)) throw chatError("INVALID_META_OBJECT", 400);
  const events: IncomingMetaEvent[] = [];
  for (const entry of body.entry) for (const event of Array.isArray(entry.messaging) ? entry.messaging : []) {
    // Copied Meta echo guard: bot and operator echoes never enter the engine.
    if (event.message?.is_echo || event.message?.metadata === "lorentz-bot-message") continue;
    if (!event.message && !event.postback) continue;
    const senderId = event.sender?.id || "";
    const pageId = event.recipient?.id || entry.id || "";
    const mid = event.message?.mid || event.postback?.mid || "";
    if (!/^\d{1,40}$/.test(senderId) || !/^\d{1,40}$/.test(pageId)) continue;
    // The Meta app may also be subscribed to other pages (it served Sello before). Only the Lorentz
    // page's messages enter this bot; Facebook pages are keyed by entry id, Instagram by the IG account.
    if (!allowedAccount(pageId, entry.id || "")) continue;
    if (!mid || typeof mid !== "string" || mid.length > 160) throw chatError("INVALID_META_MESSAGE", 400);
    const text = event.message?.text || event.postback?.payload || "Мессежийн хавсралтыг ажилтнаар шалгуулъя.";
    if (typeof text !== "string" || text.length > MAX_INCOMING_TEXT_CHARS) throw chatError("INVALID_META_MESSAGE", 400);
    const platform = body.object === "instagram" ? "instagram" : "facebook";
    const eventKey = hash(`${pageId}:${buildEventKey(platform, senderId, { message: { mid, text } })}`);
    events.push({ platform, senderId, pageId, mid, text, eventKey, token: null, igUserId: platform === "instagram" ? pageId : null });
  }
  if (events.length > 10) throw chatError("META_BATCH_TOO_LARGE", 503);
  return events;
}

export async function processMetaEvents(events: IncomingMetaEvent[]) {
  const conversationIds = new Set<string>();
  // Persist all receipts before acknowledgement; no worker or self-fetch.
  for (const event of events) {
    const channel = event.platform === "instagram" ? "instagram" : "messenger";
    const c = await prisma.chatConversation.upsert({ where: { channel_externalId: { channel, externalId: `${event.pageId}:${event.senderId}` } }, create: { channel, externalId: `${event.pageId}:${event.senderId}`, tokenHash: hash(newToken()), state: { metaRecipient: event.senderId, metaPage: event.pageId } }, update: {} });
    await enqueuePendingConversationConsistent(c.id, event);
    conversationIds.add(c.id);
  }
  if (conversationIds.size > 3) throw new RetryableWebhookError("batch_concurrency_limit");
  const deadline = Date.now() + 25_000;
  await Promise.all([...conversationIds].map(async (conversationId) => {
    const c = await prisma.chatConversation.findUniqueOrThrow({ where: { id: conversationId } });
    const receipts = await prisma.chatWebhookEvent.findMany({ where: { conversationId, completed: false }, orderBy: { createdAt: "asc" }, take: 10 });
    for (const receipt of receipts) {
      if (Date.now() + 5000 >= deadline) throw new RetryableWebhookError("request_deadline");
      const payload = receipt.payload as unknown as PendingConversationPayload;
      await runEventWithClaim(receipt.id, { platform: payload.platform, eventType: "dm" }, async (complete) => {
        const result = await handleCustomerMessage({ conversationId, text: payload.text, clientMessageId: `meta:${receipt.id}` });
        if (result.reply) {
          const delivery = await sendMetaMessage(c, result.reply);
          if (delivery === "failed" || delivery === "sending") throw new RetryableWebhookError("delivery_failed");
          await prisma.chatWebhookEvent.update({ where: { id: receipt.id }, data: { messageId: result.reply.id } });
        }
        await complete();
      });
    }
  }));
}

/** Echoes of messages a person sent from the Page inbox (Meta Business Suite). The bot's own echoes carry its metadata. */
export function parseStaffEchoes(input: unknown): StaffEcho[] {
  const body = (input && typeof input === "object" ? input : {}) as MetaBody;
  if (body.object !== "page" && body.object !== "instagram") return [];
  const echoes: StaffEcho[] = [];
  for (const entry of Array.isArray(body.entry) ? body.entry : []) for (const event of Array.isArray(entry.messaging) ? entry.messaging : []) {
    const message = event.message;
    if (!message?.is_echo || message.metadata === "lorentz-bot-message") continue;
    if (process.env.META_APP_ID && String(message.app_id ?? "") === process.env.META_APP_ID) continue;
    const pageId = event.sender?.id || entry.id || "";
    const customerId = event.recipient?.id || "";
    const mid = message.mid || "";
    if (!/^\d{1,40}$/.test(pageId) || !/^\d{1,40}$/.test(customerId) || !mid || mid.length > 160) continue;
    if (!allowedAccount(pageId, entry.id || "")) continue;
    echoes.push({ platform: body.object === "instagram" ? "instagram" : "facebook", pageId, customerId, mid, text: (message.text || "").slice(0, MAX_INCOMING_TEXT_CHARS) });
  }
  return echoes;
}

/**
 * A person answered from the Page inbox: the conversation is paused (the bot stays silent) and the
 * reply is kept in the admin inbox. The owner's auto-resume time hands it back as for an admin takeover.
 * An echo whose text equals a reply the bot sent in the last ten minutes is the bot's own (Instagram
 * echoes may arrive without the bot's metadata) and is ignored.
 */
export async function recordStaffEchoes(echoes: StaffEcho[]) {
  for (const echo of echoes) {
    const channel = echo.platform === "instagram" ? "instagram" : "messenger";
    const conversation = await prisma.chatConversation.findUnique({ where: { channel_externalId: { channel, externalId: `${echo.pageId}:${echo.customerId}` } } });
    if (!conversation) continue;
    const ownReply = await prisma.chatMessage.findFirst({ where: { conversationId: conversation.id, role: "assistant", text: echo.text, createdAt: { gte: new Date(Date.now() - 10 * 60_000) } } });
    if (ownReply) continue;
    const clientMessageId = `staff:meta:${hash(echo.mid).slice(0, 40)}`;
    const existing = await prisma.chatMessage.findFirst({ where: { conversationId: conversation.id, clientMessageId } });
    if (existing) continue;
    const now = new Date();
    await prisma.chatMessage.create({ data: { conversationId: conversation.id, role: "staff", text: echo.text || "(Ажилтан Meta-ийн inbox-оос хариулсан)", clientMessageId, metadata: { source: "meta_inbox" }, deliveryStatus: "sent" } });
    const state = conversation.state && typeof conversation.state === "object" && !Array.isArray(conversation.state) ? conversation.state : {};
    await prisma.chatConversation.update({ where: { id: conversation.id }, data: { paused: true, lastHumanAt: now, state: { ...state, humanTakeoverAt: now.toISOString(), pauseReason: "meta_inbox" } } });
  }
}
