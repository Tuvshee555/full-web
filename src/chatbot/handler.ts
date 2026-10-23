/**
 * The ONE customer-message entry point (website widget, admin test chat, demo, Messenger, Instagram).
 * This file is the persistence around a turn (Uudam's webhook.ts side effects): lease + dedup,
 * staff takeover, saving messages, leads and staff alerts. The conversation logic itself is
 * runCustomerTurn() in turn.ts.
 * Uudam lesson: a handoff never silences the bot. Only an admin takeover (paused) or the global
 * switch does. Every other turn gets a reply.
 */
import { randomUUID } from "node:crypto";
import type { ChatConversation, ChatMessage as ChatMessageRow } from "@prisma/client";
import { background } from "../../server/utils/background.js";
import { prisma } from "./prisma";
import { getSettings } from "./settings.mjs";
import { readContext } from "./catalogue";
import { detectLanguage } from "./language";
import { chatError, logError, privateOrderStatus, rateLimit } from "./security.js";
import { withChatbotContext } from "./runtimeContext";
import { understandingModel } from "./productUnderstandingModel";
import { openAIReply } from "./productWriter";
import { contactFallback } from "./reply";
import { contactDetails } from "./orderHelp";
import { notifyStaffOfLead, shouldAlertWaitingMessage } from "./staffAlerts";
import { runCustomerTurn, type TurnOutput } from "./turn";
import type { BotSettings, ChatMessage, ConversationState, Locale } from "./types";

export { runCustomerTurn } from "./turn";
export type TurnResult = { conversationId: string; reply: ChatMessageRow | null; paused: boolean; duplicate?: boolean };

const LEASE_MS = 25_000;

function rowsToHistory(rows: ChatMessageRow[]): ChatMessage[] {
  return rows.map((row) => ({ role: row.role === "customer" ? "user" : "assistant", text: row.text }));
}

/** One open lead per conversation; one staff alert per new lead or newly supplied phone. */
async function saveLead(conversation: ChatConversation, leaseOwner: string, text: string, locale: Locale): Promise<void> {
  const contact = contactDetails(text);
  const state = (conversation.state || {}) as ConversationState;
  const name = contact.name || (typeof state.name === "string" ? state.name : "") || null;
  const phone = contact.phone || (typeof state.phone === "string" ? state.phone : "") || null;
  const { notify } = await prisma.$transaction(async (tx) => {
    const existing = await tx.chatLead.findFirst({ where: { conversationId: conversation.id, status: { not: "done" } }, orderBy: { createdAt: "desc" } });
    if (existing) await tx.chatLead.update({ where: { id: existing.id }, data: { name: name || existing.name, phone: phone || existing.phone } });
    else await tx.chatLead.create({ data: { conversationId: conversation.id, name, phone, question: text.slice(0, 2000) } });
    const patch = JSON.stringify({ ...(name ? { name } : {}), ...(phone ? { phone } : {}), handoffLocale: locale });
    // needsHuman flags the inbox; it never pauses the bot (only an admin takeover does).
    const changed = await tx.$executeRaw`UPDATE "ChatConversation" SET "needsHuman" = true, "state" = "state" || ${patch}::jsonb, "updatedAt" = NOW() WHERE "id" = ${conversation.id} AND "leaseOwner" = ${leaseOwner}`;
    if (changed !== 1) throw chatError("CONVERSATION_BUSY", 409);
    return { notify: !existing || (Boolean(phone) && existing.phone !== phone) };
  });
  if (notify) background(notifyStaffOfLead({ kind: "handoff", platform: conversation.channel, customerMessage: text, contactPhone: phone || undefined }));
}

/** A message arrived while nobody automated is answering: ping the owner once per burst. Never blocks or fails the request. */
async function alertStaffOfWaitingMessage(conversation: ChatConversation, messageId: string, text: string): Promise<void> {
  try {
    const previous = await prisma.chatMessage.findFirst({
      where: { conversationId: conversation.id, role: "customer", id: { not: messageId } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    if (!shouldAlertWaitingMessage(previous?.createdAt)) return;
    const state = (conversation.state || {}) as ConversationState;
    const phone = contactDetails(text).phone || (typeof state.phone === "string" ? state.phone : "") || undefined;
    background(notifyStaffOfLead({ kind: "inbox", platform: conversation.channel, customerMessage: text, contactPhone: phone }));
  } catch (error) {
    await logError((error as { code?: string }).code || "STAFF_ALERT_FAILURE", "alertStaffOfWaitingMessage", conversation.id);
  }
}

export async function handleCustomerMessage(input: { conversationId: string; text: string; clientMessageId: string }): Promise<TurnResult> {
  const { conversationId, clientMessageId } = input;
  let text = input.text;
  if (typeof text !== "string" || !text.trim() || text.length > 2000 || typeof clientMessageId !== "string" || !/^[\w:.-]{1,180}$/.test(clientMessageId)) throw chatError("INVALID_MESSAGE", 400);
  text = text.trim();
  await rateLimit(`conversation:${conversationId}`, 15);
  const leaseOwner = randomUUID();
  const locked = await prisma.chatConversation.updateMany({
    where: { id: conversationId, OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }] },
    data: { leaseUntil: new Date(Date.now() + LEASE_MS), leaseOwner },
  });
  if (!locked.count) throw chatError("CONVERSATION_BUSY", 409);
  const started = Date.now();
  try {
    let conversation = await prisma.chatConversation.findUniqueOrThrow({ where: { id: conversationId } });
    return await withChatbotContext({ channel: conversation.channel, conversationId }, async () => {
      const duplicate = await prisma.chatMessage.findUnique({ where: { conversationId_clientMessageId: { conversationId, clientMessageId } } });
      if (duplicate) {
        if (duplicate.text !== text) throw chatError("MESSAGE_ID_REUSED", 409);
        const reply = await prisma.chatMessage.findUnique({ where: { conversationId_clientMessageId: { conversationId, clientMessageId: `reply:${clientMessageId}` } } });
        if (reply || conversation.paused) return { conversationId, reply, paused: conversation.paused, duplicate: true };
        // Resume a turn whose function died after saving the inbound message but before the reply.
      }
      const settings = await getSettings();
      const customerMessage = duplicate || await prisma.chatMessage.create({ data: { conversationId, role: "customer", text, clientMessageId } });
      conversation = await prisma.chatConversation.update({ where: { id: conversationId }, data: { ...(!duplicate ? { unread: { increment: 1 } } : {}) } });

      // Staff takeover / global off: keep the message for the inbox, no automated reply, but tell the owner.
      if (conversation.paused || !settings.enabled) {
        if (!duplicate) await alertStaffOfWaitingMessage(conversation, customerMessage.id, text);
        return { conversationId, reply: null, paused: true };
      }

      const firstContext = await readContext(settings as BotSettings, conversation.locale === "en" ? "en" : "mn");
      const locale = detectLanguage(text, conversation.locale, firstContext.products);
      const context = locale === firstContext.locale ? firstContext : { ...firstContext, locale, brand: (await readContext(settings as BotSettings, locale)).brand };
      const rows = await prisma.chatMessage.findMany({ where: { conversationId, id: { not: customerMessage.id } }, orderBy: { createdAt: "desc" }, take: 12 });
      const history = rowsToHistory(rows.reverse());
      const state = (conversation.state && typeof conversation.state === "object" && !Array.isArray(conversation.state) ? conversation.state : {}) as ConversationState;

      let turn: TurnOutput;
      try {
        turn = await runCustomerTurn({
          text, history, state, context, senderId: conversationId,
          askUnderstanding: process.env.OPENAI_API_KEY ? understandingModel({ correlationId: conversationId }) : null,
          askReply: process.env.OPENAI_API_KEY ? openAIReply : null,
          orderLookup: (orderNumber, phone) => privateOrderStatus(prisma, orderNumber, phone),
        });
      } catch (error) {
        await logError((error as { code?: string }).code || "BOT_FAILURE", "handleCustomerMessage", conversationId);
        turn = { text: contactFallback(context), state: { ...state, lastIntent: "error" }, intent: "error", needsHuman: true, productIds: [], model: "fallback" };
      }

      const statePatch = JSON.stringify(turn.state);
      const changed = await prisma.$executeRaw`UPDATE "ChatConversation" SET "locale" = ${locale}, "state" = "state" || ${statePatch}::jsonb, "updatedAt" = NOW() WHERE "id" = ${conversationId} AND "leaseOwner" = ${leaseOwner}`;
      if (changed !== 1) throw chatError("CONVERSATION_BUSY", 409);
      if (turn.needsHuman) {
        conversation = await prisma.chatConversation.findUniqueOrThrow({ where: { id: conversationId } });
        await saveLead(conversation, leaseOwner, text, locale);
      }

      // Recheck takeover/kill switch after the provider wait, before publishing.
      const current = await prisma.chatConversation.findUniqueOrThrow({ where: { id: conversationId } });
      if (current.leaseOwner !== leaseOwner) throw chatError("CONVERSATION_BUSY", 409);
      if (!(await getSettings()).enabled || current.paused) return { conversationId, reply: null, paused: true };

      const saved = await prisma.chatMessage.create({ data: { conversationId, role: "assistant", text: turn.text, clientMessageId: `reply:${clientMessageId}`,
        metadata: { intent: turn.intent, productIds: turn.productIds, model: turn.model, durationMs: Date.now() - started, handoff: turn.needsHuman } } });
      await prisma.chatConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
      return { conversationId, reply: saved, paused: false };
    });
  } catch (error) {
    await logError((error as { code?: string }).code || "HANDLER_FAILURE", "handleCustomerMessage", conversationId);
    throw error;
  } finally {
    await prisma.chatConversation.updateMany({ where: { id: conversationId, leaseOwner }, data: { leaseUntil: null, leaseOwner: null } });
  }
}
