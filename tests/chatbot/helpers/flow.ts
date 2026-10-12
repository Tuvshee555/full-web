import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { runCustomerTurn } from "../../../src/chatbot/handler";
import { setStateAdapter } from "../../../src/chatbot/conversationState";
import type { ChatMessage, ConversationState } from "../../../src/chatbot/types";
import { context, fakeOrder } from "./fixtures";

export async function runFlow(texts: string[], locale: "mn" | "en" = "en") {
  const states = new Map<string, ConversationState>();
  setStateAdapter({ read: async id => states.get(id) || {}, merge: async (id, patch) => { states.set(id, { ...states.get(id), ...patch }); } });
  const history: ChatMessage[] = [], results = [];
  let state: ConversationState = {};
  const senderId = randomUUID();
  try {
    for (const text of texts) {
      const result = await runCustomerTurn({ text, history, state, context: context(locale), senderId,
        askUnderstanding: async () => null, askReply: async () => null,
        orderLookup: async (number: string, phone: string) => number === fakeOrder.number && phone.replace(/\D/g, "").endsWith(fakeOrder.phone) ? fakeOrder.status : null,
      });
      assert.ok(result.text.trim(), `Customer turn must receive a reply: ${text}`);
      assert.doesNotMatch(result.text, /TEST_PRIVATE_ORDER_ADDRESS|guaranteed regrowth|100\s*%/i);
      assert.doesNotMatch(result.text, /\b(?:REFER|SILENT)\b/);
      results.push(result); state = result.state;
      history.push({ role: "user", text }, { role: "assistant", text: result.text });
    }
    return results;
  } finally { setStateAdapter(null); }
}
