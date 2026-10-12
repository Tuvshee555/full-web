import { randomUUID } from "node:crypto";
import { prisma } from "../utils/prisma.js";
import { background } from "../utils/background.js";
import { sendTelegramMessage } from "../utils/telegram.js";
import { getSettings } from "./settings.js";
import { readContext } from "./catalogue.js";
import { detectLanguage, understandTurn, handoffRequested, medicalQuestion } from "./understanding.js";
import { renderReply, verifyReply, contactFallback } from "./reply.js";
import { chatError, logError, rateLimit, normalizePhone, privateOrderStatus } from "./security.js";

function contactDetails(text) {
  const phone = text.match(/(?:\+?976[ -]?)?\b\d{8}\b/)?.[0] || "";
  const name = text.match(/(?:миний нэр|намайг|name(?: is)?|ner)\s*[:：]?\s*([\p{L} '-]{2,60})/iu)?.[1]?.trim() || "";
  return { phone: normalizePhone(phone), name };
}

export async function saveHandoff(conversation, text, details = {}) {
  const contact = contactDetails(text);
  const state = conversation.state || {};
  const name = details.name || contact.name || state.name || null;
  const phone = normalizePhone(details.phone || contact.phone || state.phone) || null;
  const lead = await prisma.$transaction(async (tx) => {
    const current = await tx.chatConversation.findUniqueOrThrow({ where: { id: conversation.id }, select: { state: true } });
    const existing = await tx.chatLead.findFirst({ where: { conversationId: conversation.id, status: { not: "done" } }, orderBy: { createdAt: "desc" } });
    const lead = existing
      ? await tx.chatLead.update({ where: { id: existing.id }, data: { name, phone } })
      : await tx.chatLead.create({ data: { conversationId: conversation.id, name, phone, question: text.slice(0, 2000) } });
    await tx.chatConversation.update({ where: { id: conversation.id }, data: { paused: true, needsHuman: true, state: { ...current.state, ...(name ? { name } : {}), ...(phone ? { phone } : {}) } } });
    return { lead, notify: !existing || existing.phone !== phone || existing.name !== name };
  });
  if (lead.notify && conversation.channel !== "test") {
    background(sendTelegramMessage(`Lorentz · Customer needs help\nChannel: ${conversation.channel}\nName: ${name || "—"}\nPhone: ${phone || "—"}\nQuestion: ${lead.lead.question}\nConversation: ${conversation.id}`));
  }
  return lead.lead;
}

/** Every channel, including admin test and Meta, calls this exact handler. */
export async function handleCustomerMessage({ conversationId, text, clientMessageId }) {
  if (typeof text !== "string" || !text.trim() || text.length > 2000 || typeof clientMessageId !== "string" || !/^[\w:.-]{1,180}$/.test(clientMessageId)) throw chatError("INVALID_MESSAGE", 400);
  text = text.trim();
  await rateLimit(`conversation:${conversationId}`, 15);
  const leaseOwner = randomUUID();
  const locked = await prisma.chatConversation.updateMany({
    where: { id: conversationId, OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }] },
    data: { leaseUntil: new Date(Date.now() + 25_000), leaseOwner },
  });
  if (!locked.count) throw chatError("CONVERSATION_BUSY", 409);
  const started = Date.now();
  try {
    let conversation = await prisma.chatConversation.findUniqueOrThrow({ where: { id: conversationId } });
    const duplicate = await prisma.chatMessage.findUnique({ where: { conversationId_clientMessageId: { conversationId, clientMessageId } } });
    if (duplicate) {
      const reply = await prisma.chatMessage.findUnique({ where: { conversationId_clientMessageId: { conversationId, clientMessageId: `reply:${clientMessageId}` } } });
      return { conversationId, reply, paused: conversation.paused, duplicate: true };
    }
    const settings = await getSettings();
    let locale = detectLanguage(text, conversation.locale);
    const userMessage = await prisma.chatMessage.create({ data: { conversationId, role: "customer", text, clientMessageId } });
    conversation = await prisma.chatConversation.update({ where: { id: conversationId }, data: { locale, unread: { increment: 1 } } });
    // Takeover and global off save inbound messages, but produce no automated reply.
    if (conversation.paused || !settings.enabled) {
      if (conversation.needsHuman) await saveHandoff(conversation, text);
      return { conversationId, reply: null, paused: true };
    }
    const context = await readContext(settings, locale);
    let plan;
    let reply;
    let turn;
    try {
      const history = (await prisma.chatMessage.findMany({ where: { conversationId, id: { not: userMessage.id } }, orderBy: { createdAt: "desc" }, take: 12 })).reverse();
      // Explicit human/medical requests do not depend on provider availability.
      if (handoffRequested(text) || medicalQuestion(text)) turn = { intents: [handoffRequested(text) ? "handoff" : "medical"], productIds: [], ...contactDetails(text), locale, model: "rules", usage: 0 };
      else turn = await understandTurn({ text, history, state: conversation.state || {}, context });
      locale = turn.locale;
      context.locale = locale;
      // Never carry a phone over to a different order number.
      const state = conversation.state || {};
      const orderNumber = turn.orderNumber || state.pendingOrderNumber || "";
      const phone = turn.phone || (turn.orderNumber && turn.orderNumber !== state.pendingOrderNumber ? "" : state.pendingOrderPhone) || "";
      const hasOrderCredentials = Boolean(orderNumber && phone);
      const orderStatus = turn.intents.includes("order") && hasOrderCredentials ? await privateOrderStatus(prisma, orderNumber, phone) : null;
      plan = { intents: turn.intents, productIds: turn.productIds, hasOrderCredentials, orderStatus };
      reply = renderReply(plan, context);
      if (!verifyReply(reply.text, plan, context)) throw chatError("REPLY_VERIFICATION_FAILED");
      const nextState = { ...state, selectedProductIds: turn.productIds.length ? turn.productIds : state.selectedProductIds || [] };
      if (turn.intents.includes("order")) {
        // Status is not remembered as evidence; credentials expire after the next turn.
        nextState.pendingOrderNumber = hasOrderCredentials ? "" : orderNumber;
        nextState.pendingOrderPhone = hasOrderCredentials ? "" : phone;
      } else { nextState.pendingOrderNumber = ""; nextState.pendingOrderPhone = ""; }
      await prisma.chatConversation.update({ where: { id: conversationId }, data: { locale, state: nextState } });
      conversation.state = nextState;
      if (reply.needsHuman) await saveHandoff(conversation, text, turn);
    } catch (error) {
      await logError(error.code || (error.name === "TimeoutError" ? "OPENAI_TIMEOUT" : "BOT_FAILURE"), "handleCustomerMessage", conversationId);
      await saveHandoff(conversation, text);
      reply = { text: contactFallback(context), needsHuman: true };
    }
    // Recheck kill switch/takeover after the provider wait, before publishing.
    const currentSettings = await getSettings();
    const currentConversation = await prisma.chatConversation.findUniqueOrThrow({ where: { id: conversationId } });
    if (!currentSettings.enabled || (currentConversation.paused && !reply.needsHuman) || new Date(currentConversation.state?.humanTakeoverAt || 0).getTime() >= started) return { conversationId, reply: null, paused: true };
    const saved = await prisma.chatMessage.create({ data: { conversationId, role: "assistant", text: reply.text, clientMessageId: `reply:${clientMessageId}`,
      metadata: { intents: plan?.intents || ["fallback"], productIds: plan?.productIds || [], model: turn?.model || "fallback", tokens: turn?.usage || 0, durationMs: Date.now() - started, verified: Boolean(plan), hasOrderCredentials: plan?.hasOrderCredentials || false } } });
    await prisma.chatConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
    return { conversationId, reply: saved, paused: currentConversation.paused };
  } catch (error) {
    await logError(error.code || "HANDLER_FAILURE", "handleCustomerMessage", conversationId);
    throw error;
  } finally {
    await prisma.chatConversation.updateMany({ where: { id: conversationId, leaseOwner }, data: { leaseUntil: null, leaseOwner: null } });
  }
}
