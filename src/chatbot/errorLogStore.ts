/**
 * Persistent, self-cleaning log of everything that went wrong in the bot.
 *
 * Vercel's own logs are short-lived and hard to search after a client reports
 * "the AI assistant broke yesterday". Every error/warn record (plus a few
 * "the bot went quiet on purpose" events) is copied into Postgres so the cause
 * can be looked up later, and rows older than ERROR_LOG_RETENTION_DAYS are
 * deleted automatically so the table can never grow into a storage problem.
 *
 * Fed by observability.ts (logEvent). Everything here is best-effort: a logging
 * failure must never affect a customer reply, and this module never calls the
 * observability loggers itself (that would loop back into itself).
 */

import { prisma } from "./prisma";
import { background } from "../../server/utils/background.js";
import { shouldPersistLog } from "./observability";

export const ERROR_LOG_RETENTION_DAYS = 7;
/** Hard ceiling on stored rows, so an error storm can't outgrow the week. */
export const ERROR_LOG_MAX_ROWS = 20_000;
const MAX_INSERTS_PER_MINUTE = 120;
const PRUNE_INTERVAL_MS = 60 * 60 * 1000;
const MAX_MESSAGE_CHARS = 1000;
const MAX_FIELDS_CHARS = 8000;

export type PersistableLogRecord = Record<string, unknown> & {
  level?: unknown;
  event?: unknown;
};

/** Strips credentials that can leak into error text (URLs, auth headers). */
export function scrubSecrets(text: string): string {
  return text
    .replace(/(access_token=)[^&\s"'\\]+/gi, "$1[redacted]")
    .replace(/(bearer\s+)[A-Za-z0-9._~+/=-]{8,}/gi, "$1[redacted]")
    .replace(/(sk-[A-Za-z0-9_-]{8,})/g, "[redacted]");
}

/**
 * Postgres rejects NUL characters and unpaired surrogates in text/jsonb, and
 * garbled input (mojibake, broken emoji) is exactly what error logs contain.
 * Without this, those rows would fail to insert and be silently lost.
 */
export function sanitizeForPostgres(text: string): string {
  return (
    text
      // real NUL character (text columns)
      .replace(/\u0000/g, "")
      // JSON-escaped NUL inside a stringified fields blob (jsonb)
      .replace(/\\u0000/g, "")
      // JSON-escaped unpaired surrogates (jsonb)
      .replace(
        /\\ud[89ab][0-9a-f]{2}(?!\\ud[c-f][0-9a-f]{2})|(?<!\\ud[89ab][0-9a-f]{2})\\ud[c-f][0-9a-f]{2}/gi,
        "",
      )
      // real unpaired surrogates (text columns)
      .replace(/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g, "")
  );
}

export type StoredErrorLog = {
  id: string;
  created_at: string;
  level: string;
  event: string;
  message: string;
  request_id: string;
  correlation_id: string;
  sender_hash: string;
  fields: Record<string, unknown>;
};

type Prepared = {
  level: string;
  event: string;
  message: string;
  requestId: string;
  correlationId: string;
  senderHash: string;
  fields: string;
};

const ENVELOPE_KEYS = new Set([
  "ts",
  "level",
  "service",
  "event",
  "message",
  "requestId",
  "correlationId",
  "senderHash",
  "customerHash",
]);

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Pure shaping step (exported for tests): log record -> row values. */
export function prepareLogRow(record: PersistableLogRecord): Prepared | null {
  if (!shouldPersistLog(record.level, record.event)) return null;

  const rest: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (!ENVELOPE_KEYS.has(key)) rest[key] = value;
  }
  let fields = sanitizeForPostgres(scrubSecrets(JSON.stringify(rest)));
  if (fields.length > MAX_FIELDS_CHARS) {
    fields = JSON.stringify({ truncated: true, preview: fields.slice(0, MAX_FIELDS_CHARS) });
  }

  return {
    level: String(record.level),
    event: String(record.event).slice(0, 200),
    message: sanitizeForPostgres(scrubSecrets(asText(record.message))).slice(0, MAX_MESSAGE_CHARS),
    requestId: asText(record.requestId).slice(0, 100),
    correlationId: asText(record.correlationId).slice(0, 100),
    senderHash: (asText(record.senderHash) || asText(record.customerHash)).slice(0, 64),
    fields,
  };
}

// Per-instance flood guard: a hot error loop must not turn into a write storm.
let windowStartedAt = 0;
let windowCount = 0;
let windowDropped = 0;
let lastPruneAt = 0;

function admitInsert(now: number): { admit: boolean; droppedToReport: number } {
  let droppedToReport = 0;
  if (now - windowStartedAt >= 60_000) {
    droppedToReport = windowDropped;
    windowStartedAt = now;
    windowCount = 0;
    windowDropped = 0;
  }
  if (windowCount >= MAX_INSERTS_PER_MINUTE) {
    windowDropped += 1;
    return { admit: false, droppedToReport };
  }
  windowCount += 1;
  return { admit: true, droppedToReport };
}

async function insertRow(row: Prepared): Promise<void> {
  const fields = JSON.parse(row.fields);
  await prisma.chatErrorLog.create({ data: {
    code: row.event, source: String(fields.source || row.requestId || "chatbot").slice(0, 100),
    conversationId: typeof fields.conversationId === "string" ? fields.conversationId : null,
    level: row.level, details: { ...fields, message: row.message, requestId: row.requestId, correlationId: row.correlationId, senderHash: row.senderHash },
  } });
}

async function writeLog(record: PersistableLogRecord): Promise<void> {
  try {
    const row = prepareLogRow(record);
    if (!row || !process.env.DATABASE_URL) return;
    const now = Date.now();
    const { admit, droppedToReport } = admitInsert(now);
    if (droppedToReport > 0) await insertRow({ level: "warn", event: "error_log_store.flood_dropped", message: "Flood guard dropped log records", requestId: "", correlationId: "", senderHash: "", fields: JSON.stringify({ dropped: droppedToReport }) });
    if (admit) await insertRow(row);
    if (now - lastPruneAt >= PRUNE_INTERVAL_MS) { lastPruneAt = now; await pruneErrorLogs(); }
  } catch { console.warn(JSON.stringify({ level: "warn", event: "error_log_store.write_failed" })); }
}

export function persistLogRecord(record: PersistableLogRecord): void {
  if (shouldPersistLog(record.level, record.event)) background(writeLog(record));
}

export async function pruneErrorLogs(): Promise<{ expired: number; overflow: number }> {
  const expired = await prisma.chatErrorLog.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - ERROR_LOG_RETENTION_DAYS * 86400000) } } });
  const excess = await prisma.chatErrorLog.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: ERROR_LOG_MAX_ROWS, take: 1000, select: { id: true } });
  const overflow = excess.length ? await prisma.chatErrorLog.deleteMany({ where: { id: { in: excess.map(row => row.id) } } }) : { count: 0 };
  return { expired: expired.count, overflow: overflow.count };
}

export type ErrorLogQuery = { hours?: number; level?: "error" | "warn" | "info"; event?: string; search?: string; limit?: number };
function clampInt(value: unknown, fallback: number, min: number, max: number) {
  const n = typeof value === "number" ? Math.trunc(value) : Number.NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export async function listErrorLogs(query: ErrorLogQuery = {}): Promise<StoredErrorLog[]> {
  const hours = clampInt(query.hours, 24, 1, ERROR_LOG_RETENTION_DAYS * 24);
  const limit = clampInt(query.limit, 200, 1, 500);
  const rows = await prisma.chatErrorLog.findMany({ where: {
    createdAt: { gte: new Date(Date.now() - hours * 3600000) },
    ...(query.level ? { level: query.level } : {}), ...(query.event ? { code: query.event } : {}),
    ...(query.search?.trim() ? { OR: [{ code: { contains: query.search.trim().slice(0, 100), mode: "insensitive" as const } }, { source: { contains: query.search.trim().slice(0, 100), mode: "insensitive" as const } }] } : {}),
  }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: limit });
  return rows.map(row => { const fields = row.details as Record<string, unknown>; return {
    id: row.id, created_at: row.createdAt.toISOString(), level: row.level, event: row.code,
    message: asText(fields.message), request_id: asText(fields.requestId), correlation_id: asText(fields.correlationId), sender_hash: asText(fields.senderHash), fields,
  }; });
}
export type ErrorLogSummaryRow = { event: string; level: string; count: number; last_at: string };
export async function summarizeErrorLogs(hours = 24): Promise<ErrorLogSummaryRow[]> {
  const window = clampInt(hours, 24, 1, ERROR_LOG_RETENTION_DAYS * 24);
  const rows = await prisma.chatErrorLog.groupBy({ by: ["code", "level"], where: { createdAt: { gte: new Date(Date.now() - window * 3600000) } }, _count: true, _max: { createdAt: true }, orderBy: { _count: { code: "desc" } }, take: 60 });
  return rows.map(row => ({ event: row.code, level: row.level, count: row._count, last_at: row._max.createdAt?.toISOString() || "" }));
}
