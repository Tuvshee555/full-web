import type { ChatMessage } from "@/components/chatbot/ChatThread";
export type Conversation = {
  id: string; channel: string; locale: string; paused: boolean; needsHuman: boolean; unread: number; updatedAt: string; messages: ChatMessage[];
  customerName?: string | null; customerPhone?: string | null; notes?: string; handoffReason?: string | null; handoffAt?: string | null; lastHumanAt?: string | null;
  lead?: { id: string; status: string; reason: string; context: string; name: string | null; phone: string | null; createdAt: string } | null;
};
export type Lead = { id: string; conversationId: string; name: string | null; phone: string | null; question: string; status: string; reason?: string; context?: string; createdAt?: string };
export type Settings = {
  enabled: boolean; metaOutbound: boolean; lowStockThreshold: number; showExactStock: boolean; greetingMn: string; greetingEn: string; handoffMn: string; handoffEn: string; extraKnowledgeMn: string; extraKnowledgeEn: string;
  chatOrdersEnabled: boolean; handoverAutoResumeHours: number; aiModel: string; aiDailyBudgetUsd: number;
};
export const HANDOFF_REASONS = ["customer_request", "complaint", "payment_claim", "medical", "unanswered", "order_problem", "ai_error"] as const;
export type HandoffReasonKey = (typeof HANDOFF_REASONS)[number];
/** The translation key for a hand-off reason, with unknown values shown as "customer_request". */
export const reasonKey = (reason: string | null | undefined): `chat.reason.${HandoffReasonKey}` => `chat.reason.${(HANDOFF_REASONS as readonly string[]).includes(reason || "") ? (reason as HandoffReasonKey) : "customer_request"}`;
