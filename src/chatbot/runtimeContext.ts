import { AsyncLocalStorage } from "node:async_hooks";

type TurnContext = { channel: string; conversationId: string };
const context = new AsyncLocalStorage<TurnContext>();
export const getChatbotContext = () => context.getStore();
export function withChatbotContext<T>(value: TurnContext, work: () => Promise<T>): Promise<T> {
  return context.run(value, work);
}
