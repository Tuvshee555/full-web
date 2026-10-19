import type { ChatMessage } from "@/components/chatbot/ChatThread";
export type Conversation = { id: string; channel: string; locale: string; paused: boolean; needsHuman: boolean; unread: number; updatedAt: string; messages: ChatMessage[] };
export type Lead = { id: string; conversationId: string; name: string | null; phone: string | null; question: string; status: string };
export type Settings = { enabled: boolean; metaOutbound: boolean; lowStockThreshold: number; showExactStock: boolean; greetingMn: string; greetingEn: string; handoffMn: string; handoffEn: string; extraKnowledgeMn: string; extraKnowledgeEn: string };
export const button = "min-h-[44px] border border-ink/20 bg-white px-3 py-2 text-sm hover:bg-sand disabled:cursor-not-allowed disabled:opacity-40";
export const input = "min-h-[44px] min-w-0 w-full border border-ink/20 bg-white p-3 text-base outline-none focus:border-ink sm:text-sm";
