/**
 * Short-lived "which product did you mean?" state.
 *
 * When the bot asks a disambiguation question ("Таны асууж байгаа аялал 2-3
 * өөр хувилбартай байна: …"), the candidates it OFFERED must scope the
 * customer's next answer. Without this state the follow-up was matched
 * against the whole catalog plus recent turns — a distinctive product name from
 * an older, unrelated turn could hijack the match and the bot would answer
 * about a product it never offered (observed live: "шууд нислэгтэй" after a
 * two-<city>-products clarification was answered with the <city> combo from
 * a stale turn).
 *
 * Redis-backed with in-memory fallback, mirroring photoOnlyState.ts.
 */

import { readConversationState, mergeConversationState } from "./conversationState";
export type ClarificationState = {
  candidateProductIds: string[];
  createdAt: number;
};

// Hours, not minutes. This was 10 minutes, but Messenger customers routinely
// answer "which of these products?" much later: one tapped their choice 35 minutes
// after the question, the bot had already forgotten what it offered and re-asked
// the same list. Stale state is harmless — an answer that fits none of the
// offered products drops it (see routeFastPathText) — so a long window costs nothing.
const TTL_MS = 6 * 60 * 60 * 1000;
export async function getClarificationState(senderId: string): Promise<ClarificationState | null> {
 const state=(await readConversationState(senderId)).clarification as ClarificationState | null;
 if(!state || Date.now()-state.createdAt>TTL_MS) return null;
 return state;
}
export async function setClarificationState(senderId:string,candidateProductIds:string[]):Promise<void> {
 await mergeConversationState(senderId,{clarification:{candidateProductIds:candidateProductIds.slice(0,8),createdAt:Date.now()}});
}
export async function clearClarificationState(senderId:string):Promise<void> { await mergeConversationState(senderId,{clarification:null}); }