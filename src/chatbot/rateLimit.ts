import net from "net";
import { createHash } from "node:crypto";
import { prisma } from "./prisma";
import type { PrismaClient } from "@prisma/client";
import { recordCounter } from "./observability";

type LimitResult = { allowed: boolean; remaining: number; reset: number };
let store: Pick<PrismaClient, "chatRateBucket"> = prisma;
export function setRateLimitStoreForTests(value: typeof store | null) { store = value || prisma; }
// Database-backed fixed windows replace the copied Redis/memory backend.
// Each upsert increments atomically across Vercel instances; no fail-open path.
export async function rateLimitAsync(key: string, limit: number, windowMs: number): Promise<LimitResult> {
  const now = Date.now();
  const window = Math.floor(now / windowMs);
  const reset = (window + 1) * windowMs;
  const hashed = createHash("sha256").update(key).digest("hex");
  const bucket = await store.chatRateBucket.upsert({
    where: { key: `${hashed}:${windowMs}:${window}` },
    create: { key: `${hashed}:${windowMs}:${window}`, expiresAt: new Date(reset) },
    update: { count: { increment: 1 } },
  });
  const allowed = bucket.count <= limit;
  recordCounter(allowed ? "rate_limit.allowed_total" : "rate_limit.blocked_total", 1, { backend: "postgres" });
  // Bounded expiry cleanup piggybacks on requests instead of a worker/interval.
  if (Math.random() < 0.01) await store.chatRateBucket.deleteMany({ where: { expiresAt: { lt: new Date(now) } } });
  return { allowed, remaining: Math.max(0, limit - bucket.count), reset };
}

type ClientLike = {
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string | null };
};

function pickHeaderValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value
      .map((entry) => entry.trim())
      .filter(Boolean)
      .join(",");
  }
  return value?.trim() ?? "";
}

function normalizeIp(candidate: string): string {
  if (!candidate) return "";
  const trimmed = candidate.trim();
  const bracketedIpv6 = trimmed.match(/^\[([a-fA-F0-9:]+)\](?::\d+)?$/);
  if (bracketedIpv6?.[1] && net.isIP(bracketedIpv6[1])) return bracketedIpv6[1];

  const withOptionalPort = trimmed.match(/^(\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?$/);
  if (withOptionalPort?.[1] && net.isIP(withOptionalPort[1])) return withOptionalPort[1];

  const ipv4Mapped = trimmed.startsWith("::ffff:") ? trimmed.slice(7) : trimmed;
  if (net.isIP(ipv4Mapped)) return ipv4Mapped;
  return "";
}

function extractForwardedIp(headerValue: string): string {
  if (!headerValue) return "";
  const chain = headerValue
    .split(",")
    .map((part) => normalizeIp(part))
    .filter(Boolean);
  if (!chain.length) return "";

  // Conservative choice: closest hop to the app is harder to spoof than left-most values.
  return chain[chain.length - 1] || "";
}

export function getClientKey(req: ClientLike) {
  const trustProxyHeaders = (process.env.VERCEL === "1" || process.env.TRUST_PROXY_HEADERS === "1");

  if (trustProxyHeaders) {
    const vercelForwarded = pickHeaderValue(req.headers?.["x-vercel-forwarded-for"]);
    const forwarded = pickHeaderValue(req.headers?.["x-forwarded-for"]);
    const realIpHeader = pickHeaderValue(req.headers?.["x-real-ip"]);

    const vercelIp = extractForwardedIp(vercelForwarded);
    if (vercelIp) return vercelIp;

    const forwardedIp = extractForwardedIp(forwarded);
    if (forwardedIp) return forwardedIp;

    const realIp = normalizeIp(realIpHeader);
    if (realIp) return realIp;
  }

  const remote = normalizeIp(req.socket?.remoteAddress || "");
  if (remote) return remote;
  return "unknown";
}

export function buildShardedRateLimitKey(
  prefix: string,
  partitionSource: string,
  shardCount = 16,
): string {
  const safeShardCount = Math.max(1, Math.floor(shardCount));
  let hash = 0;
  for (let i = 0; i < partitionSource.length; i += 1) {
    hash = (hash * 31 + partitionSource.charCodeAt(i)) >>> 0;
  }
  const shard = hash % safeShardCount;
  return `${prefix}:shard:${shard}`;
}

export function getRateLimitDiagnostics() { return { backend: "postgres" }; }
