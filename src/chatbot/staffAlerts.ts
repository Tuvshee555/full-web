import { sendTelegramMessage } from "../../server/utils/telegram.js";
import { siteUrl } from "../../server/utils/siteUrl.js";
import { logError, logInfo, recordCounter } from "./observability";
/** handoff: the bot asked for a human. inbox: a message is waiting because the bot is off or staff took over. */
export type StaffLeadAlert = { kind: "handoff" | "inbox"; platform: string; customerMessage: string; contactPhone?: string };
export type StaffAlertDeliveryResult = { attempted: number; delivered: number };
export function buildAlertText(alert: StaffLeadAlert): string {
  const heading =
    alert.kind === "inbox"
      ? "💬 Шинэ мессеж — хариулахыг хүлээж байна"
      : "🔔 Шинэ хүсэлт — хэрэглэгч хүнтэй ярихыг хүсэв";
  const channel = alert.platform === "instagram" ? "Instagram" : alert.platform === "messenger" ? "Facebook" : "Website";
  const lines = [
    heading,
    `Суваг: ${channel}`,
    `Зурвас: "${alert.customerMessage.slice(0, 300)}"`,
  ];
  if (alert.contactPhone) lines.push(`Утас: ${alert.contactPhone}`);
  lines.push(
    alert.kind === "inbox"
      ? `Хариулахдаа админ самбарын «Чат» хэсэгт орно уу:\n${siteUrl()}/admin/mn/home-page?view=chatbot`
      : "Дэлгэрэнгүйг админ самбарын «Хүсэлтүүд» хэсгээс хараарай.",
  );
  return lines.join("\n");
}

/** One alert per burst of messages: stay quiet if the customer already wrote within the last 10 minutes. */
export const WAITING_ALERT_GAP_MS = 10 * 60 * 1000;
export function shouldAlertWaitingMessage(previousCustomerMessageAt: Date | null | undefined, now = Date.now()): boolean {
  return !previousCustomerMessageAt || now - previousCustomerMessageAt.getTime() >= WAITING_ALERT_GAP_MS;
}


export function hasStaffAlertChannel(): boolean { return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID); }
/** Durable lead is written first; caller holds the conversation lease and calls once. */
export async function notifyStaffOfLead(alert: StaffLeadAlert): Promise<StaffAlertDeliveryResult> {
  if (alert.platform === "test") return { attempted: 0, delivered: 0 };
  return notifyStaff(buildAlertText(alert), alert.kind, alert.platform);
}
export async function notifyStaff(text: string, kind: string, channel = "test"): Promise<StaffAlertDeliveryResult> {
  if (channel === "test") return { attempted: 0, delivered: 0 };
  if (!hasStaffAlertChannel()) { recordCounter("staff_alert.no_channel_total", 1, { kind }); logError("staff_alert.no_channel_configured", { kind }); return { attempted: 0, delivered: 0 }; }
  const delivered = (await sendTelegramMessage(text)) === true ? 1 : 0;
  recordCounter(delivered ? "staff_alert.sent_total" : "staff_alert.failed_total", 1, { kind, channel: "telegram" });
  if (delivered) logInfo("staff_alert.sent", { kind, channel: "telegram" });
  else logError("staff_alert.all_channels_failed", { kind });
  return { attempted: 1, delivered };
}
