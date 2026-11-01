/**
 * Pure aggregation over stored assistant replies (their metadata) for the admin Activity page.
 * Nothing here reads the database; the API route passes the rows in.
 */
export type AssistantMessageRow = { createdAt: Date; metadata: unknown; clientMessageId: string | null; conversationId: string };

type Meta = { intent?: string; model?: string; aiModel?: string; durationMs?: number; handoff?: boolean; handoffReason?: string; events?: string[] };

export type ActivitySummary = {
  assistantMessages: number;
  purchaseIntent: number; checkoutLinks: number; chatOrdersStarted: number; chatOrdersCreated: number;
  handovers: number; handoversByReason: Record<string, number>;
  unanswered: number; unpublishedFacts: Record<string, number>;
  safetyQuestions: number; growthQuestions: number; shopFaqAnswers: number; notInCatalogue: number;
  intents: Record<string, number>; models: Record<string, number>;
  avgDurationMs: number; p95DurationMs: number;
  /** Replies that mean a customer did not get a real answer; the question is looked up by the API. */
  unansweredReplies: Array<{ conversationId: string; customerClientMessageId: string | null; at: Date; kind: string }>;
};

const metaOf = (value: unknown): Meta => (value && typeof value === "object" && !Array.isArray(value) ? (value as Meta) : {});
const count = (map: Record<string, number>, key: string) => { map[key] = (map[key] || 0) + 1; };

export function summarizeAssistantMessages(rows: AssistantMessageRow[]): ActivitySummary {
  const summary: ActivitySummary = {
    assistantMessages: rows.length, purchaseIntent: 0, checkoutLinks: 0, chatOrdersStarted: 0, chatOrdersCreated: 0,
    handovers: 0, handoversByReason: {}, unanswered: 0, unpublishedFacts: {}, safetyQuestions: 0, growthQuestions: 0, shopFaqAnswers: 0, notInCatalogue: 0,
    intents: {}, models: {}, avgDurationMs: 0, p95DurationMs: 0, unansweredReplies: [],
  };
  const durations: number[] = [];
  for (const row of rows) {
    const meta = metaOf(row.metadata);
    if (meta.intent) count(summary.intents, meta.intent);
    count(summary.models, meta.model === "writer" ? `writer:${meta.aiModel || "unknown"}` : meta.model || "rules");
    if (typeof meta.durationMs === "number" && Number.isFinite(meta.durationMs)) durations.push(meta.durationMs);
    if (meta.handoff) { summary.handovers += 1; count(summary.handoversByReason, meta.handoffReason || "customer_request"); }
    const events = Array.isArray(meta.events) ? meta.events : [];
    let unansweredKind: string | null = null;
    for (const event of events) {
      if (event === "purchase_intent") summary.purchaseIntent += 1;
      else if (event === "checkout_link") summary.checkoutLinks += 1;
      else if (event === "chat_order_started") summary.chatOrdersStarted += 1;
      else if (event === "chat_order_created") summary.chatOrdersCreated += 1;
      else if (event === "safety_question") summary.safetyQuestions += 1;
      else if (event === "growth_question") summary.growthQuestions += 1;
      else if (event === "shop_faq") summary.shopFaqAnswers += 1;
      else if (event === "not_in_catalogue") summary.notInCatalogue += 1;
      else if (event === "unanswered") unansweredKind = "unanswered";
      else if (event.startsWith("unpublished_fact:")) { count(summary.unpublishedFacts, event.slice("unpublished_fact:".length)); unansweredKind ||= event; }
    }
    if (meta.handoffReason === "unanswered" || meta.handoffReason === "ai_error") unansweredKind ||= meta.handoffReason;
    if (unansweredKind) {
      summary.unanswered += 1;
      summary.unansweredReplies.push({ conversationId: row.conversationId, customerClientMessageId: row.clientMessageId?.startsWith("reply:") ? row.clientMessageId.slice("reply:".length) : null, at: row.createdAt, kind: unansweredKind });
    }
  }
  if (durations.length) {
    const sorted = [...durations].sort((a, b) => a - b);
    summary.avgDurationMs = Math.round(sorted.reduce((sum, value) => sum + value, 0) / sorted.length);
    summary.p95DurationMs = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
  }
  return summary;
}

export type UsageRow = { day: string; model: string; calls: number; promptTokens: number; completionTokens: number; estCostUsd: number };

export function summarizeUsage(rows: UsageRow[]) {
  const byModel: Record<string, { calls: number; promptTokens: number; completionTokens: number; estCostUsd: number }> = {};
  const byDay: Record<string, { calls: number; estCostUsd: number }> = {};
  let calls = 0, promptTokens = 0, completionTokens = 0, estCostUsd = 0;
  for (const row of rows) {
    calls += row.calls; promptTokens += row.promptTokens; completionTokens += row.completionTokens; estCostUsd += row.estCostUsd;
    const model = (byModel[row.model] ||= { calls: 0, promptTokens: 0, completionTokens: 0, estCostUsd: 0 });
    model.calls += row.calls; model.promptTokens += row.promptTokens; model.completionTokens += row.completionTokens; model.estCostUsd += row.estCostUsd;
    const day = (byDay[row.day] ||= { calls: 0, estCostUsd: 0 });
    day.calls += row.calls; day.estCostUsd += row.estCostUsd;
  }
  const round = (value: number) => Math.round(value * 10000) / 10000;
  return {
    calls, promptTokens, completionTokens, estCostUsd: round(estCostUsd),
    byModel: Object.entries(byModel).map(([model, value]) => ({ model, ...value, estCostUsd: round(value.estCostUsd) })).sort((a, b) => b.estCostUsd - a.estCostUsd),
    byDay: Object.entries(byDay).map(([day, value]) => ({ day, ...value, estCostUsd: round(value.estCostUsd) })).sort((a, b) => a.day.localeCompare(b.day)),
  };
}
