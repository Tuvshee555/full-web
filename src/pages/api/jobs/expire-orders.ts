/**
 * Scheduled reservation cleanup: cancels unpaid orders past their deadline and returns their stock.
 *
 * Callers: Vercel Cron (vercel.json; it sends `Authorization: Bearer <CRON_SECRET>` on its own) and
 * any external scheduler that sends the same header or `x-cron-secret`. Fails closed: without
 * CRON_SECRET in production every call is refused, so the URL alone can never trigger work.
 * Each run is recorded in JobRun (the admin shows the last runs), so "it runs" is checkable.
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { apiRoute, first } from "../../../chatbot/api";
import { prisma } from "../../../chatbot/prisma";
import { equalSecret } from "../../../chatbot/security.js";
import { expireUnpaidOrders } from "../../../../server/jobs/expireOrders.js";
import { cleanupGuestUsers } from "../../../../server/jobs/cleanupGuests.js";

export const config = { maxDuration: 60 };

export function cronAuthorized(req: Pick<NextApiRequest, "headers">, env: NodeJS.ProcessEnv = process.env): boolean {
  const secret = (env.CRON_SECRET || "").trim();
  const production = env.VERCEL_ENV === "production" || env.NODE_ENV === "production";
  if (!secret) return !production;
  if (secret.length < 16) return false;
  const bearer = first(req.headers.authorization).replace(/^Bearer\s+/i, "");
  return equalSecret(bearer, secret) || equalSecret(first(req.headers["x-cron-secret"]), secret);
}

export default apiRoute(async (req, res: NextApiResponse) => {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).end();
  if (!cronAuthorized(req)) return res.status(401).json({ ok: false, error: "unauthorized" });
  const trigger = first(req.query.trigger) === "manual" ? "manual" : "cron";
  const startedAt = new Date();
  const expired = await expireUnpaidOrders(prisma, { trigger, limit: 500 });
  // Stale guest accounts are cheap to sweep here too; the result never affects the response.
  await Promise.resolve(cleanupGuestUsers()).catch(() => undefined);
  return res.status(200).json({ ok: true, job: "expire-orders", trigger, expired, startedAt, finishedAt: new Date() });
});
