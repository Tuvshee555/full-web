import { readConversationState, mergeConversationState } from "./conversationState";
import type { ProductSelection } from "./productRequest";
type SelectionState = { selection: ProductSelection; updatedAt: number };
const TTL_SEC = 6 * 60 * 60;

export async function getProductSelection(senderId: string): Promise<ProductSelection | null> {
  const state = (await readConversationState(senderId)).productSelection as SelectionState | null;
  if (!state || Date.now() - state.updatedAt >= TTL_SEC * 1_000) return null;
  return state.selection;
}
export async function setProductSelection(senderId: string, selection: ProductSelection | null): Promise<void> {
  await mergeConversationState(senderId, { productSelection: selection ? { selection, updatedAt: Date.now() } : null });
}
