import { prisma } from "./prisma";
import { handleCustomerMessage } from "./handler";
import { chatError, hash, newToken } from "./security.js";
import { sendMetaMessage } from "./metaDelivery";
import { buildEventKey, enqueuePendingConversationConsistent, MAX_INCOMING_TEXT_CHARS, runEventWithClaim, RetryableWebhookError, type PendingConversationPayload } from "./webhookDedup";

export type IncomingMetaEvent = PendingConversationPayload & { eventKey: string; mid: string };
type MetaEvent = { sender?: { id?: string }; recipient?: { id?: string }; message?: { mid?: string; text?: string; is_echo?: boolean; metadata?: string; attachments?: unknown[] }; postback?: { mid?: string; payload?: string } };
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
    const allowedPages = [process.env.META_PAGE_ID, process.env.META_INSTAGRAM_ID].filter(Boolean);
    if (allowedPages.length && !allowedPages.includes(pageId) && !allowedPages.includes(entry.id || "")) continue;
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
