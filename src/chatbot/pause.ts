import { prisma } from "./prisma";
export type PausedRow = { sender_id: string; paused_at: string; expires_at: string | null; reason?: string };
export type RecentSender = { sender_id: string; last_seen: string; display_name?: string };
export async function isPaused(senderId: string): Promise<boolean> {
  const row = await prisma.chatConversation.findUnique({ where: { id: senderId }, select: { paused: true } });
  return row?.paused === true;
}
// Automatic handoff only flags the conversation. Explicit admin takeover owns pause.
export async function pauseBot(senderId: string, _durationMs?: number, reason = "manual"): Promise<void> {
  const row = await prisma.chatConversation.findUniqueOrThrow({ where: { id: senderId } });
  const state = row.state && typeof row.state === "object" && !Array.isArray(row.state) ? row.state : {};
  await prisma.chatConversation.update({ where: { id: senderId }, data: { paused: true, needsHuman: true, state: { ...state, humanTakeoverAt: new Date().toISOString(), pauseReason: reason } } });
}
export async function resumeBot(senderId: string): Promise<void> {
  const row = await prisma.chatConversation.findUniqueOrThrow({ where: { id: senderId } });
  const state = row.state && typeof row.state === "object" && !Array.isArray(row.state) ? row.state : {};
  await prisma.chatConversation.update({ where: { id: senderId }, data: { paused: false, needsHuman: false, state: { ...state, humanTakeoverAt: "", pauseReason: "" } } });
}
export async function autoHandoffSender(senderId: string): Promise<void> {
  await prisma.chatConversation.update({ where: { id: senderId }, data: { needsHuman: true } });
}
export async function listPaused(): Promise<PausedRow[]> {
  const rows = await prisma.chatConversation.findMany({ where: { paused: true, channel: { not: "test" } }, orderBy: { updatedAt: "desc" }, take: 100 });
  return rows.map((r) => ({ sender_id: r.id, paused_at: r.updatedAt.toISOString(), expires_at: null, reason: "manual" }));
}
export async function listRecent(): Promise<RecentSender[]> {
  const rows = await prisma.chatConversation.findMany({ where: { channel: { not: "test" } }, orderBy: { updatedAt: "desc" }, take: 100 });
  return rows.map((r) => ({ sender_id: r.id, last_seen: r.updatedAt.toISOString() }));
}
