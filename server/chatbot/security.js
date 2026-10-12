import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "../utils/prisma.js";

export const hash = (value) => createHash("sha256").update(value).digest("hex");
export const newToken = () => randomBytes(32).toString("hex");
export function equalSecret(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const left = Buffer.from(a); const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
export function chatError(code, status = 500) {
  return Object.assign(new Error(code), { code, status });
}
export async function logError(code, source, conversationId) {
  // Never persist exception text, prompts, tokens, provider bodies or customer data.
  console.error(JSON.stringify({ scope: "chatbot", code, source }));
  try { await prisma.chatErrorLog.create({ data: { code, source, conversationId } }); } catch { /* database may be unavailable */ }
}
export async function rateLimit(key, limit, windowMs = 60_000) {
  const window = Math.floor(Date.now() / windowMs);
  const bucket = await prisma.chatRateBucket.upsert({
    where: { key: `${hash(key)}:${window}` },
    create: { key: `${hash(key)}:${window}`, expiresAt: new Date((window + 1) * windowMs) },
    update: { count: { increment: 1 } },
  });
  if (bucket.count > limit) throw chatError("RATE_LIMITED", 429);
}
export async function authorizeConversation(id, token) {
  if (typeof id !== "string" || id.length > 100 || typeof token !== "string" || token.length > 100) throw chatError("NOT_FOUND", 404);
  const conversation = await prisma.chatConversation.findUnique({ where: { id } });
  if (!conversation || conversation.channel !== "website" || !equalSecret(conversation.tokenHash, hash(token))) throw chatError("NOT_FOUND", 404);
  return conversation;
}
export function normalizePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("976") ? digits.slice(3) : digits;
}
export async function privateOrderStatus(db, orderNumber, phone) {
  const normalized = normalizePhone(phone);
  if (!orderNumber || !/^\d{8}$/.test(normalized)) return null;
  // Fetch only the credential and status of this one order, never a user's orders.
  const cleanNumber = String(orderNumber).trim().replace(/^#+/, "");
  const order = await db.foodOrder.findUnique({ where: { orderNumber: cleanNumber }, select: { phone: true, status: true } });
  if (!order || !equalSecret(normalizePhone(order.phone), normalized)) return null;
  return order.status;
}
