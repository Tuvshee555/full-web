// Audit trail for the chat assistant's configuration and conversations: who changed a setting,
// a FAQ row, a product's facts or verification, who took a chat over, and which orders the
// assistant created or the expiry job cancelled. Written in the background; never blocks or
// fails the request that caused it. Values are summarised (no customer message text, no secrets).
import { prisma } from "../prismaClient.js";
import { background } from "./background.js";

const ACTOR_LIMIT = 160;
const TARGET_LIMIT = 200;

/** A short, safe form of a changed value for the log (strings cut to 120 characters). */
export function summarizeDetails(details) {
  if (!details || typeof details !== "object" || Array.isArray(details)) return {};
  const out = {};
  for (const [key, value] of Object.entries(details).slice(0, 40)) {
    if (value === null || typeof value === "number" || typeof value === "boolean") out[key] = value;
    else if (typeof value === "string") out[key] = value.length > 120 ? `${value.slice(0, 117)}...` : value;
    else if (Array.isArray(value)) out[key] = value.slice(0, 20).map((item) => (typeof item === "string" ? item.slice(0, 120) : typeof item === "number" || typeof item === "boolean" ? item : String(item).slice(0, 120)));
    else if (typeof value === "object") out[key] = summarizeDetails(value);
  }
  return out;
}

/** Records one entry; `actor` is the admin's email, "assistant", "system" or "cron". */
export function recordAudit({ actor, action, target, details }, { client = prisma } = {}) {
  if (typeof action !== "string" || !action.trim()) return;
  const data = {
    actor: String(actor || "system").slice(0, ACTOR_LIMIT),
    action: action.trim().slice(0, 80),
    target: target == null ? null : String(target).slice(0, TARGET_LIMIT),
    details: summarizeDetails(details),
  };
  try {
    if (typeof client?.chatAuditLog?.create !== "function") return;
    background(Promise.resolve(client.chatAuditLog.create({ data })).then(() => undefined).catch((error) => {
      console.error("audit.record_failed", error?.message || error);
    }));
  } catch (error) {
    console.error("audit.record_failed", error?.message || error);
  }
}

/** The admin's email for the log (the JWT only carries the id); falls back to the id. */
export async function actorOf(user, { client = prisma } = {}) {
  if (!user?.id) return "unknown";
  try {
    const row = await client.user.findUnique({ where: { id: user.id }, select: { email: true } });
    return row?.email || user.id;
  } catch {
    return user.id;
  }
}
