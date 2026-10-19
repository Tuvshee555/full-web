import { siteUrl } from "./siteUrl.js";
import { PAYMENT_MN, STATUS_MN } from "./emailTemplates.js";

export async function sendTelegramMessage(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.log("Telegram env missing");
    return false;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(6000),
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      console.log("Telegram send failed:", res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.log("Telegram send failed:", err?.name || "NETWORK_ERROR");
    return false;
  }
}

const tg = (n) => `${Math.round(Number(n || 0)).toLocaleString("en-US")}₮`;
const adminOrdersUrl = () => `${siteUrl().replace(/\/$/, "")}/admin/mn/home-page?view=orders`;
const unitPriceOf = (it) => Number(it.unitPrice ?? it.food?.price ?? 0);

/** Owner alert for a new order: what to pack, what was paid, where it goes. */
export function formatOrderMessage(order) {
  const name = [order.lastName, order.firstName].filter(Boolean).join(" ");
  const address = [order.city, order.district, order.khoroo, order.address].filter(Boolean).join(", ");
  const items = order.foodOrderItems ?? [];
  const lines = items.length
    ? items
        .map((it) => {
          const qty = Number(it.quantity ?? 1);
          return `• ${it.food?.foodName ?? "Бүтээгдэхүүн"}${it.size ? ` (${it.size})` : ""}: ${qty} × ${tg(unitPriceOf(it))} = ${tg(unitPriceOf(it) * qty)}`;
        })
        .join("\n")
    : "• (бараа алга)";
  const subtotal = items.reduce((s, it) => s + unitPriceOf(it) * Number(it.quantity ?? 1), 0);

  return [
    `🛒 Шинэ захиалга #${order.orderNumber}`,
    "",
    lines,
    "",
    `Барааны дүн: ${tg(subtotal)}`,
    `Хүргэлт: ${tg(order.deliveryFee)}`,
    `Нийт: ${tg(order.totalPrice)}`,
    `Төлбөр: ${PAYMENT_MN[order.paymentMethod] ?? order.paymentMethod ?? "-"} · ${STATUS_MN[order.status] ?? order.status ?? "-"}`,
    "",
    `👤 ${name || "-"}`,
    `📞 ${order.phone || "-"}`,
    `📍 ${address || "-"}`,
    ...(order.notes ? [`📝 ${order.notes}`] : []),
    "",
    adminOrdersUrl(),
  ].join("\n");
}

/** Owner alert for a status change. */
export function formatOrderStatusMessage(order, oldStatus, newStatus) {
  const emoji = { PAID: "✅", DELIVERING: "🚚", DELIVERED: "🏁", CANCELLED: "❌" }[newStatus] ?? "🔔";
  const name = [order.lastName, order.firstName].filter(Boolean).join(" ");
  return [
    `${emoji} Захиалга #${order.orderNumber}: ${STATUS_MN[newStatus] ?? newStatus}`,
    "",
    `Өмнө: ${STATUS_MN[oldStatus] ?? oldStatus ?? "-"}`,
    `Нийт: ${tg(order.totalPrice)} · ${PAYMENT_MN[order.paymentMethod] ?? order.paymentMethod ?? "-"}`,
    `👤 ${name || "-"} · 📞 ${order.phone || "-"}`,
    "",
    adminOrdersUrl(),
  ].join("\n");
}
