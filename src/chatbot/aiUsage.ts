/**
 * Model spend ledger (pattern from the Uudam chatbot): every completion counts into a daily row per
 * environment, model and caller with an estimated cost, so the admin can see what the assistant
 * costs and the handler can stop calling the model when the day's budget is spent. The write runs
 * in the background and never blocks or fails a reply.
 */
import { background } from "../../server/utils/background.js";
import { getChatbotContext } from "./runtimeContext";
import { logError, logWarn, recordCounter } from "./observability";

export type AiUsage = { prompt_tokens: number; completion_tokens: number; total_tokens?: number };

/** USD per million tokens [input, output]; an estimate for budgeting, never a bill. */
export const PRICE_PER_MILLION_USD: Record<string, [number, number]> = {
  "gpt-4.1": [2, 8],
  "gpt-4.1-mini": [0.4, 1.6],
  "gpt-4.1-nano": [0.1, 0.4],
  "gpt-4o": [2.5, 10],
  "gpt-4o-mini": [0.15, 0.6],
  "gpt-5": [1.25, 10],
  "gpt-5-mini": [0.25, 2],
  "gpt-5-nano": [0.05, 0.4],
};

/**
 * Models the owner may pick in the admin; "" means the deployment's OPENAI_MODEL. gpt-5-mini is left
 * out on purpose: in the 2026-11-01 comparison its reasoning tokens used up the output budget and most
 * calls came back empty (docs/chatbot/MODEL_EVAL.md).
 */
export const SELECTABLE_MODELS = ["", "gpt-4.1", "gpt-4.1-mini", "gpt-4o-mini"] as const;

/**
 * The production default, approved on 2026-11-02 after the held-out comparison (docs/chatbot/MODEL_EVAL.md):
 * gpt-4.1-mini matched gpt-4.1 (56/59 each) at about a fifth of the cost.
 */
export const DEFAULT_AI_MODEL = "gpt-4.1-mini";

/**
 * Which model to call: the owner's admin choice when it is on the allow-list, else the deployment's
 * OPENAI_MODEL when it is a model with a known price, else the approved default. A premium model can
 * only be reached through one of those two explicit choices, never by accident.
 */
export function resolveAiModel(settingModel?: string | null): string {
  if (settingModel && (SELECTABLE_MODELS as readonly string[]).includes(settingModel)) return settingModel;
  const fromEnv = (process.env.OPENAI_MODEL || "").trim();
  if (fromEnv && estimateCostUsd(fromEnv, { prompt_tokens: 0, completion_tokens: 0 }) !== null) return fromEnv;
  return DEFAULT_AI_MODEL;
}

export function estimateCostUsd(model: string, usage: AiUsage): number | null {
  const price = PRICE_PER_MILLION_USD[model] ?? PRICE_PER_MILLION_USD[model.replace(/-\d{4}-\d{2}-\d{2}$/, "")];
  if (!price) return null;
  return (usage.prompt_tokens * price[0] + usage.completion_tokens * price[1]) / 1_000_000;
}

export function aiEnvironment(): string {
  return process.env.AI_USAGE_ENVIRONMENT || process.env.VERCEL_ENV || (process.env.NODE_ENV === "test" ? "test" : "local");
}

/** Today's date in the shop's time zone, as the DATE column expects it. */
export function usageDay(now = new Date()): Date {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ulaanbaatar", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return new Date(`${day}T00:00:00.000Z`);
}

type Totals = { calls: number; promptTokens: number; completionTokens: number; costUsd: number };
const processTotals: Totals = { calls: 0, promptTokens: 0, completionTokens: 0, costUsd: 0 };
export function processAiTotals(): Totals { return { ...processTotals }; }

/** Count one completion. Test chats and evaluation runs stay out of the shop's ledger. */
export function recordAiUsage(input: { model: string; source: string; usage: AiUsage }): void {
  const costUsd = estimateCostUsd(input.model, input.usage) ?? 0;
  processTotals.calls += 1;
  processTotals.promptTokens += input.usage.prompt_tokens;
  processTotals.completionTokens += input.usage.completion_tokens;
  processTotals.costUsd += costUsd;
  const environment = aiEnvironment();
  recordCounter("openai.usage_tokens_total", input.usage.prompt_tokens + input.usage.completion_tokens, { model: input.model, environment });
  if (environment === "test" || environment === "evaluation" || getChatbotContext()?.channel === "test") return;
  if (!process.env.DATABASE_URL) return;
  background(import("./prisma").then(({ prisma }) => prisma.chatAiUsage.upsert({
    where: { day_environment_model_source: { day: usageDay(), environment, model: input.model, source: input.source.slice(0, 80) } },
    create: { day: usageDay(), environment, model: input.model, source: input.source.slice(0, 80), calls: 1, promptTokens: input.usage.prompt_tokens, completionTokens: input.usage.completion_tokens, estCostUsd: costUsd },
    update: { calls: { increment: 1 }, promptTokens: { increment: input.usage.prompt_tokens }, completionTokens: { increment: input.usage.completion_tokens }, estCostUsd: { increment: costUsd } },
  })).then(() => undefined).catch((error: unknown) => logError("ai_usage.record_failed", { message: error instanceof Error ? error.message : String(error) })));
}

export type AiUsageRow = { day: string; environment: string; model: string; source: string; calls: number; promptTokens: number; completionTokens: number; estCostUsd: number };

/** Daily usage and estimated cost, newest first. */
export async function getAiUsageSummary(days = 30): Promise<AiUsageRow[]> {
  const { prisma } = await import("./prisma");
  const since = usageDay(new Date(Date.now() - Math.min(Math.max(Math.trunc(days), 1), 90) * 86_400_000));
  const rows = await prisma.chatAiUsage.findMany({ where: { day: { gte: since } }, orderBy: [{ day: "desc" }, { estCostUsd: "desc" }] });
  return rows.map((row) => ({ day: row.day.toISOString().slice(0, 10), environment: row.environment, model: row.model, source: row.source, calls: row.calls, promptTokens: row.promptTokens, completionTokens: row.completionTokens, estCostUsd: row.estCostUsd }));
}

let todayCache: { at: number; cost: number } | null = null;
let lastBudgetWarningAt = 0;

/** Today's estimated production spend, cached for a minute per process. */
export async function todayAiCostUsd(now = Date.now()): Promise<number> {
  if (todayCache && now - todayCache.at < 60_000) return todayCache.cost;
  try {
    const { prisma } = await import("./prisma");
    const total = await prisma.chatAiUsage.aggregate({ _sum: { estCostUsd: true }, where: { day: usageDay(new Date(now)), environment: aiEnvironment() } });
    todayCache = { at: now, cost: total._sum.estCostUsd ?? 0 };
  } catch {
    todayCache = { at: now, cost: 0 };
  }
  return todayCache.cost;
}

export function resetAiUsageCacheForTests() { todayCache = null; lastBudgetWarningAt = 0; }

/** Pure: is the model allowed given the day's spend and the owner's budget (0 = no limit)? */
export function withinBudget(spentUsd: number, budgetUsd: number | undefined | null): boolean {
  const budget = Number(budgetUsd);
  if (!Number.isFinite(budget) || budget <= 0) return true;
  return spentUsd < budget;
}

/** False when today's spend passed the budget: the assistant then answers from rules only. Warns at most hourly. */
export async function aiAllowedToday(budgetUsd: number | undefined | null): Promise<boolean> {
  const spent = await todayAiCostUsd();
  if (withinBudget(spent, budgetUsd)) return true;
  if (Date.now() - lastBudgetWarningAt > 3_600_000) {
    lastBudgetWarningAt = Date.now();
    logWarn("ai_budget.exceeded", { spentUsd: Number(spent.toFixed(4)), budgetUsd });
  }
  return false;
}
