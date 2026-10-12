import { prisma } from "./prisma";
import { getChatbotContext } from "./runtimeContext";
import { logError, logWarn } from "./observability";
import type { ReadinessIssue } from "./readiness";
import { UpstreamHttpError } from "./resilience";

export type AiFailureKind = "credits_exhausted" | "unauthorized" | "other";

/**
 * OpenAI answers both a passing rate limit and an empty balance with 429; only
 * the body tells them apart. An empty balance silenced every customer for
 * three days in 2026-10 while the logs said nothing but "returned 429".
 */
export function aiFailureKind(error: unknown): AiFailureKind {
  if (!(error instanceof UpstreamHttpError)) return "other";
  if (/insufficient_quota|credit_balance_exhausted/.test(error.bodySnippet)) return "credits_exhausted";
  if (error.status === 401) return "unauthorized";
  return "other";
}

const ALERT_INTERVAL_HOURS = 6;
const LEADS_PATH = "Бот баталгаатай мэдээллээс товч хариулж байна.";

export function aiOutageAlertText(kind: Exclude<AiFailureKind, "other">): string {
  return kind === "credits_exhausted"
    ? `⚠️ Чатботын AI үйлчилгээ түр ажиллахгүй байна: OpenAI-ийн кредит дууссан.\nplatform.openai.com → Billing хэсэгт кредит нэмнэ үү. ${LEADS_PATH}`
    : `⚠️ Чатботын AI үйлчилгээ түр ажиллахгүй байна: OpenAI түлхүүр хүчингүй байна.\nOPENAI_API_KEY-г шалгана уу. ${LEADS_PATH}`;
}

let lastAlertAtMs = 0;

/** Tells staff nobody is being answered — at most once per six hours across instances. Never throws. */
export async function reportAiOutage(kind: AiFailureKind): Promise<void> {
  if (getChatbotContext()?.channel === "test") return;
  if (kind === "other") return;
  try {
    const now = Date.now();
    if (now - lastAlertAtMs < ALERT_INTERVAL_HOURS * 3_600_000) return;
    lastAlertAtMs = now;
    const recent = await prisma.chatErrorLog.findFirst({ where: { code: "ai_outage.detected", createdAt: { gt: new Date(now - ALERT_INTERVAL_HOURS * 3600000) } } });
    if (recent) return;
    // Operational inbox warning only: QA provider failures must never alert Telegram.
    logWarn("ai_outage.detected", { kind });
  } catch (error) {
    logError("ai_outage.report_failed", { message: error instanceof Error ? error.message : String(error) });
  }
}

type AiFailureSummary = { failures: number; minutes_since_last: number | null; credits: boolean; unauthorized: boolean };

/** Problems an operator must act on, shown in the admin system check. */
export async function getOperationalIssues(): Promise<ReadinessIssue[]> {
  const issues: ReadinessIssue[] = [];
  try {
    const rows = await prisma.chatErrorLog.findMany({ where: { code: "openai.fallback_failed", createdAt: { gt: new Date(Date.now() - 2 * 3600000) } }, orderBy: { createdAt: "desc" }, take: 500 });
    const failures: AiFailureSummary = { failures: rows.length, minutes_since_last: rows[0] ? (Date.now() - rows[0].createdAt.getTime()) / 60000 : null, credits: rows.some(row => JSON.stringify(row.details).includes("credits_exhausted")), unauthorized: rows.some(row => JSON.stringify(row.details).includes("unauthorized")) };
    const ongoing = failures && failures.minutes_since_last !== null && failures.minutes_since_last <= 30;
    if (ongoing && (failures.credits || failures.unauthorized || failures.failures >= 3)) {
      const cause = failures.credits
        ? "OpenAI-ийн кредит дууссан — platform.openai.com → Billing."
        : failures.unauthorized
          ? "OpenAI түлхүүр хүчингүй — OPENAI_API_KEY-г шалгана уу."
          : "OpenAI хариу өгөхгүй байна.";
      issues.push({
        severity: "critical",
        key: "ai_outage",
        message: `AI үйлчилгээ түр ажиллахгүй, бот баталгаатай мэдээллээс хариулж байна (сүүлийн 2 цагт ${failures.failures} алдаа). ${cause}`,
      });
    }
  } catch (error) {
    logError("operational_issues.query_failed", { message: error instanceof Error ? error.message : String(error) });
  }
  return issues;
}
