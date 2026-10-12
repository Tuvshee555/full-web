import { mergeConversationState, readConversationState } from "./conversationState";
export type HistoryRow = { id: number; role: "user" | "assistant"; text: string; created_at: string; attachments: Array<{ type: string }> };
type CustomerMemory = { memory_text: string; last_conversation_id: number };
export async function dbGetCustomerMemory(senderId: string): Promise<CustomerMemory | null> {
  const state = await readConversationState(senderId);
  return state.customerMemory as CustomerMemory | null || null;
}
export async function dbGetHistorySince(senderId: string, cursor: number, limit: number): Promise<HistoryRow[]> {
  const { prisma } = await import("./prisma");
  // The original numeric append cursor becomes an offset over an immutable ordered message history.
  const rows = await prisma.chatMessage.findMany({ where: { conversationId: senderId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], skip: cursor, take: limit });
  return rows.map((row, index) => ({ id: cursor + index + 1, role: row.role === "customer" ? "user" : "assistant", text: row.text, created_at: row.createdAt.toISOString(), attachments: [] }));
}
export async function dbUpsertCustomerMemory(input: { senderId: string; memoryText: string; lastConversationId: number }): Promise<void> {
  await mergeConversationState(input.senderId, { customerMemory: { memory_text: input.memoryText, last_conversation_id: input.lastConversationId } });
}
