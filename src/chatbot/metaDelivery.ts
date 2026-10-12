import type { ChatConversation, ChatMessage } from "@prisma/client";
import { prisma } from "./prisma";
import { getSettings } from "./settings.js";
import { chatError, logError } from "./security.js";
import { isMetaOutboundDisabled } from "./metaOutboundKillSwitch";
import { sendTextMessage as sendFacebookText } from "./messenger";
import { sendTextMessage as sendInstagramText } from "./instagram";

export function metaConfigured() { return Boolean(process.env.META_PAGE_ACCESS_TOKEN && process.env.META_APP_SECRET && process.env.META_VERIFY_TOKEN); }
export async function sendMetaMessage(conversation: ChatConversation, message: ChatMessage, { human = false } = {}) {
  if (message.deliveryStatus === "sent" || message.deliveryStatus === "uncertain") return message.deliveryStatus;
  const [settings, current] = await Promise.all([getSettings(), prisma.chatConversation.findUniqueOrThrow({ where: { id: conversation.id } })]);
  if (!metaConfigured() || !settings.metaOutbound || isMetaOutboundDisabled() || (!human && (!settings.enabled || current.paused))) {
    await prisma.chatMessage.update({ where: { id: message.id }, data: { deliveryStatus: "suppressed" } });
    return "suppressed";
  }
  const state = current.state && typeof current.state === "object" && !Array.isArray(current.state) ? current.state : {};
  const recipient = String(state.metaRecipient || "");
  const page = String(state.metaPage || "");
  if (!/^\d{1,40}$/.test(recipient) || !/^\d{1,40}$/.test(page)) throw chatError("META_RECIPIENT_MISSING");
  const claim = await prisma.chatMessage.updateMany({ where: { id: message.id, deliveryStatus: { in: ["local", "failed", "suppressed"] } }, data: { deliveryStatus: "sending" } });
  if (!claim.count) return "sending";
  const token = process.env.META_PAGE_ACCESS_TOKEN || "";
  try {
    if (current.channel === "instagram") await sendInstagramText(page, recipient, message.text, token, { source: "chatbot.webhook" });
    else await sendFacebookText(recipient, message.text, token, { source: "chatbot.webhook" });
    await prisma.chatMessage.update({ where: { id: message.id }, data: { deliveryStatus: "sent" } });
    return "sent";
  } catch (error) {
    // A timeout can mean delivery succeeded. Preserve its uncertainty instead
    // of automatically resending the same customer message.
    const definitive = typeof (error as { status?: unknown })?.status === "number";
    const status = definitive ? "failed" : "uncertain";
    await prisma.chatMessage.update({ where: { id: message.id }, data: { deliveryStatus: status } });
    await logError(definitive ? "META_HTTP_FAILURE" : "META_DELIVERY_UNCERTAIN", "metaDelivery", current.id);
    return status;
  }
}
