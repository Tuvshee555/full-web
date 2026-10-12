import type { NextApiRequest, NextApiResponse } from "next";
import { waitUntil } from "@vercel/functions";
import { backgroundSettled } from "../../server/utils/background.js";
import { STORE } from "../config/store-data.mjs";
import { prisma } from "./prisma";
import { rateLimitAsync, getClientKey } from "./rateLimit";
import { chatError, equalSecret, hash, logError } from "./security.js";

export type AdminRequest = NextApiRequest & { user?: { id: string; role: string } };
export function first(value: string | string[] | undefined) { return (Array.isArray(value) ? value[0] : value) || ""; }
export function qaAuthorized(req: NextApiRequest) {
  const secret = process.env.CHATBOT_QA_SECRET;
  return Boolean(secret && secret.length >= 32 && equalSecret(first(req.headers["x-chatbot-qa-secret"]), secret));
}
export async function limitRequest(req: NextApiRequest, scope: string, limit: number, windowMs = 60_000) {
  const result = await rateLimitAsync(`${scope}:${getClientKey(req)}`, limit, windowMs);
  if (!result.allowed) throw chatError("RATE_LIMITED", 429);
}
export function apiRoute(handler: (req: AdminRequest, res: NextApiResponse) => Promise<unknown>) {
  return async (req: AdminRequest, res: NextApiResponse) => {
    res.setHeader("Cache-Control", "no-store");
    try { await handler(req, res); }
    catch (error) {
      const e = error as { code?: string; status?: number };
      const status = e.status || 503;
      if (status >= 500 && !qaAuthorized(req)) await logError(e.code || "API_UNAVAILABLE", "pagesApi");
      if (!res.headersSent) res.status(status).json({ code: e.code || "CHAT_UNAVAILABLE", message: first(req.query.locale) === "en" || req.body?.locale === "en" ? "Chat is temporarily unavailable. Please contact our team." : "Чат түр ажиллахгүй байна. Манай ажилтантай холбогдоно уу.", contact: STORE.contact });
    } finally { waitUntil(backgroundSettled()); }
  };
}
export async function publicMessages(id: string) {
  const rows = await prisma.chatMessage.findMany({ where: { conversationId: id }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, role: true, text: true, createdAt: true, deliveryStatus: true } });
  return rows.reverse();
}
export async function authorizePublic(req: NextApiRequest, id: string) {
  const token = first(req.headers["x-chat-token"]);
  if (!id || id.length > 100 || !token || token.length > 100) throw chatError("NOT_FOUND", 404);
  const c = await prisma.chatConversation.findUnique({ where: { id } });
  if (!c || !(c.channel === "website" || (c.channel === "test" && qaAuthorized(req))) || !equalSecret(c.tokenHash, hash(token))) throw chatError("NOT_FOUND", 404);
  return c;
}
export async function deleteTestConversation(id: string) {
  await prisma.$transaction([prisma.chatErrorLog.deleteMany({ where: { conversationId: id } }), prisma.chatConversation.delete({ where: { id } })]);
}
