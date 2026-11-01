/**
 * The chat assistant's order adapter: a guest customer record plus the same placeOrder() service
 * the checkout uses (server/services/placeOrder.js). Bank transfer only; the customer pays after
 * the summary they confirmed in the chat, and the usual owner alert and expiry rules apply.
 *
 * Reservation policy (owner-configurable in the admin, defaults approved on 2026-11-02):
 *   - at most `chatMaxQuantityPerItem` units of one option per chat order (the website is not capped);
 *   - at most `chatMaxActiveReservationsPerPhone` unpaid chat orders per phone number at a time,
 *     counted after any of that phone's expired orders are released, under a per-phone lock so two
 *     chats confirming at the same moment cannot both pass;
 *   - the order holds its stock for `chatReservationMinutes`, then the expiry job cancels it.
 * None of this applies to website checkout orders.
 */
import { randomUUID } from "node:crypto";
import { OrderError, notifyNewOrder, placeOrder } from "../../../server/services/placeOrder.js";
import { expireUnpaidOrders } from "../../../server/jobs/expireOrders.js";
import { recordAudit } from "../../../server/utils/audit.js";
import { prisma } from "../prisma";
import { getSettings } from "../settings.mjs";
import { logInfo } from "../observability";
import type { ChatOrderRequest, ChatOrderResult } from "../types";
import { reservationPolicy } from "./reservationPolicy";
export { reservationPolicy } from "./reservationPolicy";

const PHONE = /^\d{8}$/;

type ChatOrderError = Error & { code: string; status?: number; extra?: Record<string, unknown> };
const fail = (code: string, extra?: Record<string, unknown>, status?: number): ChatOrderError => Object.assign(new Error(code), { code, status, extra });

export async function placeChatOrder(request: ChatOrderRequest): Promise<ChatOrderResult> {
  if (!PHONE.test(request.phone)) throw fail("INVALID_PHONE");
  const [firstName, ...rest] = request.name.trim().split(/\s+/);
  const lastName = rest.join(" ") || "-";
  if (!firstName) throw fail("INVALID_NAME");
  const settings = await getSettings();
  if (settings && settings.chatOrdersEnabled === false) throw fail("DISABLED");
  const policy = reservationPolicy(settings);
  for (const item of request.items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1) throw fail("INVALID_QUANTITY");
    if (item.quantity > policy.maxQuantityPerItem) throw fail("QUANTITY_LIMIT", { limit: policy.maxQuantityPerItem, quantity: item.quantity });
  }

  // One guest account per chat order, like a guest checkout; it carries the delivery details.
  const guest = await prisma.user.create({
    // Same "guest-…@guest.invalid" shape as a guest checkout, so emails skip it and the admin shows it as a guest.
    data: { email: `guest-chat-${randomUUID()}@guest.invalid`, role: "USER", firstName, lastName, phonenumber: request.phone, city: request.city, district: request.district, khoroo: request.khoroo, address: request.address },
    select: { id: true },
  });
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + policy.minutes * 60_000);
    const { order } = await prisma.$transaction(async (tx) => {
      // Serialise chat orders per phone: the count below is then exact even for two chats at once.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`chat-order-phone:${request.phone}`}))`;
      // An earlier chat order of this phone whose deadline passed must not count against the customer.
      await expireUnpaidOrders(tx, { phone: request.phone, source: "chat", trigger: "inline", limit: 20 });
      const active = await tx.order.findMany({
        where: { source: "chat", status: "WAITING_PAYMENT", phone: request.phone, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        select: { orderNumber: true, totalPrice: true, expiresAt: true },
        orderBy: { createdAt: "desc" }, take: policy.maxActivePerPhone,
      });
      if (active.length >= policy.maxActivePerPhone) {
        const existing = active[0];
        throw new OrderError("RESERVATION_LIMIT", 409, "An unpaid chat order already holds stock for this phone number.", {
          orderNumber: existing.orderNumber, totalPrice: Number(existing.totalPrice), expiresAt: existing.expiresAt, limit: policy.maxActivePerPhone,
        });
      }
      return placeOrder({
        userId: guest.id,
        items: request.items.map((item) => ({ productId: item.productId, size: item.size, quantity: item.quantity })),
        paymentMethod: "BANK", deliveryZone: request.zone, idempotencyKey: request.idempotencyKey.slice(0, 100),
        firstName, lastName, phone: request.phone, city: request.city, district: request.district, khoroo: request.khoroo, address: request.address,
        notes: request.locale === "en" ? "Ordered in the website chat" : "Чатаар захиалсан",
        source: "chat", expiresAt,
      }, { client: tx });
    }, { maxWait: 5000, timeout: 20000 });
    notifyNewOrder(order.id);
    await prisma.chatConversation.update({ where: { id: request.conversationId }, data: { customerName: request.name.trim().slice(0, 120), customerPhone: request.phone } }).catch(() => undefined);
    logInfo("chat_order.created", { orderNumber: order.orderNumber, totalPrice: order.totalPrice, reservationMinutes: policy.minutes });
    recordAudit({ actor: "assistant", action: "chat_order_created", target: order.orderNumber, details: { conversationId: request.conversationId, totalPrice: Number(order.totalPrice), items: request.items.map((item) => `${item.productName}${item.size ? ` (${item.size})` : ""} × ${item.quantity}`), reservationMinutes: policy.minutes } });
    return { orderNumber: order.orderNumber, totalPrice: Number(order.totalPrice), deliveryFee: Number(order.deliveryFee), status: order.status, paymentMethod: order.paymentMethod, expiresAt: order.expiresAt ? new Date(order.expiresAt).toISOString() : expiresAt.toISOString(), reservationMinutes: policy.minutes };
  } catch (error) {
    // The guest row of a refused order is removed again (it never had an order).
    await prisma.user.delete({ where: { id: guest.id } }).catch(() => undefined);
    if (error instanceof OrderError) throw fail(error.code, error.extra, error.status);
    throw error;
  }
}
