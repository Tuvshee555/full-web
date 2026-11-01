/**
 * The chat assistant's order adapter: a guest customer record plus the same placeOrder() service
 * the checkout uses (server/services/placeOrder.js). Bank transfer only; the customer pays after
 * the summary they confirmed in the chat, and the usual owner alert and expiry rules apply.
 */
import { randomUUID } from "node:crypto";
import { OrderError, notifyNewOrder, placeOrder } from "../../../server/services/placeOrder.js";
import { prisma } from "../prisma";
import { logInfo } from "../observability";
import type { ChatOrderRequest, ChatOrderResult } from "../types";

const PHONE = /^\d{8}$/;

export async function placeChatOrder(request: ChatOrderRequest): Promise<ChatOrderResult> {
  if (!PHONE.test(request.phone)) throw Object.assign(new Error("INVALID_PHONE"), { code: "INVALID_PHONE" });
  const [firstName, ...rest] = request.name.trim().split(/\s+/);
  const lastName = rest.join(" ") || "-";
  if (!firstName) throw Object.assign(new Error("INVALID_NAME"), { code: "INVALID_NAME" });
  const settings = await prisma.chatSettings.findUnique({ where: { id: "default" }, select: { chatOrdersEnabled: true } });
  if (settings && settings.chatOrdersEnabled === false) throw Object.assign(new Error("DISABLED"), { code: "DISABLED" });

  // One guest account per chat order, like a guest checkout; it carries the delivery details.
  const guest = await prisma.user.create({
    // Same "guest-…@guest.invalid" shape as a guest checkout, so emails skip it and the admin shows it as a guest.
    data: { email: `guest-chat-${randomUUID()}@guest.invalid`, role: "USER", firstName, lastName, phonenumber: request.phone, city: request.city, district: request.district, khoroo: request.khoroo, address: request.address },
    select: { id: true },
  });
  try {
    const { order } = await placeOrder({
      userId: guest.id,
      items: request.items.map((item) => ({ productId: item.productId, size: item.size, quantity: item.quantity })),
      paymentMethod: "BANK", deliveryZone: request.zone, idempotencyKey: request.idempotencyKey.slice(0, 100),
      firstName, lastName, phone: request.phone, city: request.city, district: request.district, khoroo: request.khoroo, address: request.address,
      notes: request.locale === "en" ? "Ordered in the website chat" : "Чатаар захиалсан",
    });
    notifyNewOrder(order.id);
    await prisma.chatConversation.update({ where: { id: request.conversationId }, data: { customerName: request.name.trim().slice(0, 120), customerPhone: request.phone } }).catch(() => undefined);
    logInfo("chat_order.created", { orderNumber: order.orderNumber, totalPrice: order.totalPrice });
    return { orderNumber: order.orderNumber, totalPrice: Number(order.totalPrice), deliveryFee: Number(order.deliveryFee), status: order.status, paymentMethod: order.paymentMethod };
  } catch (error) {
    if (error instanceof OrderError) throw Object.assign(new Error(error.code), { code: error.code, status: error.status });
    throw error;
  }
}
