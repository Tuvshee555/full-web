import type { ConversationState } from "./types";

export type StateAdapter = { read(id: string): Promise<ConversationState>; merge(id: string, patch: ConversationState): Promise<void> };
let adapter: StateAdapter | null = null;
/** Tests inject an isolated store; production always persists in Postgres. */
export function setStateAdapter(value: StateAdapter | null) { adapter = value; }
export async function readConversationState(id: string): Promise<ConversationState> {
  if (adapter) return adapter.read(id);
  const { prisma } = await import("./prisma");
  const row = await prisma.chatConversation.findUnique({ where: { id }, select: { state: true } });
  return row?.state && typeof row.state === "object" && !Array.isArray(row.state) ? row.state as ConversationState : {};
}
export async function mergeConversationState(id: string, patch: ConversationState): Promise<void> {
  if (adapter) return adapter.merge(id, patch);
  const { prisma } = await import("./prisma");
  const encoded = JSON.stringify(patch);
  await prisma.$executeRaw`UPDATE "ChatConversation" SET "state" = "state" || ${encoded}::jsonb WHERE "id" = ${id}`;
}
