import type { NextApiRequest } from "next";
import type { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { prisma } from "./prisma";
import { hashIdentifier, recordCounter } from "./observability";
import { readRawBodyLimited } from "./webhookSecurity";
import { safeSecretCompare } from "./adminAuth";
export type Platform = "facebook" | "instagram";
export type PendingConversationPayload = { platform: Platform; senderId: string; text: string; pageId: string; igUserId?: string | null; token?: string | null; eventKey?: string; trace?: { requestId: string; correlationId: string } };
export type PendingConversationHead = { payload: PendingConversationPayload; receipt: string };
export type EventClaimState = "acquired" | "already_completed" | "in_progress";
export type EventClaim = { state: EventClaimState; complete: () => Promise<void>; release: () => Promise<void> };
export const MAX_PENDING_CONVERSATIONS = 100;
export const MAX_PENDING_PER_CONVERSATION = 20;
export const MAX_INCOMING_TEXT_CHARS = 2000;
let store: Pick<PrismaClient, "chatWebhookEvent" | "chatConversation" | "chatMessage"> = prisma;
export function setWebhookStoreForTests(value: typeof store | null) { store = value || prisma; }
export class RetryableWebhookError extends Error {
  constructor(reason: string) { super(reason); this.name = "RetryableWebhookError"; }
}
export function isRetryableWebhookError(error: unknown) { return error instanceof RetryableWebhookError; }
export function asRetryableWebhookError(error: unknown, reason: string) {
  return isRetryableWebhookError(error) ? error : new RetryableWebhookError(reason);
}
export function verifyToken(token: unknown) { return typeof token === "string" && safeSecretCompare(process.env.META_VERIFY_TOKEN || "", token); }
export async function readRawBody(req: NextApiRequest): Promise<Buffer> {
  return readRawBodyLimited(req, 4_000_000, Array.isArray(req.headers["content-length"]) ? req.headers["content-length"][0] : req.headers["content-length"]);
}
export function buildEventKey(platform: Platform, senderId: string, event: { message?: { mid?: string; text?: string } }) {
  const mid = event.message?.mid?.trim();
  if (mid) return `${platform}:mid:${mid}`;
  const normalizedText = (event.message?.text || "").trim().toLowerCase();
  return `${platform}:fallback:${senderId}:${hashIdentifier(normalizedText)}`;
}
// Same claim/checkpoint ordering as Uudam, using atomic Postgres leases.
export async function claimEventForProcessingConsistent(key: string): Promise<EventClaim> {
  const existing = await store.chatWebhookEvent.findUnique({ where: { id: key } });
  const noOp = async () => {};
  if (existing?.completed) return { state: "already_completed", complete: noOp, release: noOp };
  if (!existing) throw new RetryableWebhookError("receipt_missing");
  const owner = randomUUID();
  const claimed = await store.chatWebhookEvent.updateMany({ where: { id: key, completed: false, OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }] }, data: { leaseOwner: owner, leaseUntil: new Date(Date.now() + 35_000) } });
  if (!claimed.count) throw new RetryableWebhookError("event_in_progress");
  return {
    state: "acquired",
    complete: async () => {
      const saved = await store.chatWebhookEvent.updateMany({ where: { id: key, leaseOwner: owner }, data: { completed: true, leaseOwner: null, leaseUntil: null } });
      if (!saved.count) throw new RetryableWebhookError("event_lease_lost");
    },
    release: async () => { await store.chatWebhookEvent.updateMany({ where: { id: key, leaseOwner: owner }, data: { leaseOwner: null, leaseUntil: null } }); },
  };
}
export async function runEventWithClaim(
  key: string,
  tags: { platform: string; eventType: "dm" | "feed" },
  task: (complete: () => Promise<void>) => Promise<void>,
  onAlreadyCompleted?: () => Promise<void>,
) {
  const claim = await claimEventForProcessingConsistent(key);
  if (claim.state === "already_completed") {
    recordCounter("webhook.duplicate_event_skipped_total", 1, {
      platform: tags.platform,
      event_type: tags.eventType,
      reason: "already_completed",
    });
    if (onAlreadyCompleted) {
      try {
        await onAlreadyCompleted();
      } catch (error) {
        throw asRetryableWebhookError(error, "event_recovery_failed");
      }
    }
    return;
  }
  if (claim.state === "in_progress") {
    recordCounter("webhook.duplicate_event_skipped_total", 1, {
      platform: tags.platform,
      event_type: tags.eventType,
      reason: "in_progress",
    });
    return;
  }
  let completed = false;
  let completion: Promise<void> | null = null;
  const complete = () => {
    if (!completion) {
      completion = (async () => {
        await claim.complete();
        completed = true;
        recordCounter("webhook.event_completed_total", 1, {
          platform: tags.platform,
          event_type: tags.eventType,
        });
      })();
    }
    return completion;
  };
  try {
    await task(complete);
    await complete();
  } catch (error) {
    // An in-flight checkpoint must settle before deciding whether to release.
    // TS's closure analysis narrows `completion` to `null` here (it cannot
    // see that `complete`, called via `task` above, may have reassigned it)
    // — the cast reflects the real runtime type, not a type-safety bypass.
    const inFlight = completion as Promise<void> | null;
    if (inFlight) await inFlight.catch(() => {});
    if (!completed) {
      try {
        await claim.release();
      } catch (releaseError) {
        throw asRetryableWebhookError(releaseError, "event_claim_release_failed");
      }
    }
    throw asRetryableWebhookError(error, "event_processing_failed");
  }
}

// Pending receipts persist before acknowledgement and are drained oldest first.
export async function enqueuePendingConversationConsistent(conversationKey: string, payload: PendingConversationPayload) {
  const id = payload.eventKey || randomUUID();
  if (await store.chatWebhookEvent.findUnique({ where: { id } })) return;
  const count = await store.chatWebhookEvent.count({ where: { conversationId: conversationKey, completed: false } });
  if (count >= MAX_PENDING_PER_CONVERSATION) throw new RetryableWebhookError("pending_overflow:conversation");
  if (!count) {
    const pending = await store.chatWebhookEvent.groupBy({ by: ["conversationId"], where: { completed: false } });
    if (pending.length >= MAX_PENDING_CONVERSATIONS) throw new RetryableWebhookError("pending_overflow:global");
  }
  const safePayload = { ...payload, token: null };
  await store.chatWebhookEvent.upsert({ where: { id }, create: { id, conversationId: conversationKey, payload: safePayload }, update: {} });
}
export async function peekPendingConversationConsistent(conversationKey: string): Promise<PendingConversationHead | null> {
  const row = await store.chatWebhookEvent.findFirst({ where: { conversationId: conversationKey, completed: false }, orderBy: { createdAt: "asc" } });
  return row ? { receipt: row.id, payload: row.payload as PendingConversationPayload } : null;
}
export async function acknowledgePendingConversationConsistent(conversationKey: string, head: PendingConversationHead) {
  const result = await store.chatWebhookEvent.updateMany({ where: { id: head.receipt, conversationId: conversationKey, completed: false }, data: { completed: true } });
  return result.count > 0;
}
export async function getLastReplyConsistent(sessionId: string) {
  const row = await store.chatMessage.findFirst({ where: { conversationId: sessionId, role: "assistant" }, orderBy: { createdAt: "desc" } });
  return row ? { text: row.text, timestamp: row.createdAt.getTime() } : null;
}
export function getWebhookRuntimeDiagnostics() { return { backend: "postgres", maxPendingPerConversation: MAX_PENDING_PER_CONVERSATION }; }
