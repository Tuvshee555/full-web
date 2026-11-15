"use client";
import { useEffect, useState } from "react";
import { BarChart3, MessageSquare, RefreshCw } from "lucide-react";
import { api } from "@admin/lib/api";
import { useAdminNav } from "@admin/lib/adminNav";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { Segmented } from "@admin/components/ui/controls";
import { StatCard, StatusPill } from "@admin/components/ui/status";
import { Panel } from "@admin/components/ui/page";
import { EmptyState, ErrorState, LoadingRows, Notice } from "@admin/components/ui/feedback";
import { formatDateTime } from "@admin/utils/format";
import { reasonKey } from "../types";

type Stats = { totalContacts: number; needsHuman: number; paused: number; totalLeads: number; newLeads: number; conversationsByChannel: Record<string, number>; leadsByDay: Array<{ date: string; count: number }> };
type Period = {
  conversationsStarted: number; activeConversations: number; customerMessages: number; assistantMessages: number;
  purchaseIntent: number; checkoutLinks: number; chatOrdersStarted: number; chatOrdersCreated: number; ordersFromChat: number;
  handovers: number; handoversByReason: Record<string, number>; leads: number; leadsByReason: Record<string, number>;
  unanswered: number; unpublishedFacts: Record<string, number>; intents: Record<string, number>; models: Record<string, number>;
  avgDurationMs: number; p95DurationMs: number;
  unansweredQuestions: Array<{ conversationId: string; text: string; at: string; kind: string }>;
};
type Ai = { calls: number; promptTokens: number; completionTokens: number; estCostUsd: number; byModel: Array<{ model: string; calls: number; promptTokens: number; completionTokens: number; estCostUsd: number }>; byDay: Array<{ day: string; calls: number; estCostUsd: number }>; failures: number; rejectedReplies: number; budgetUsd: number; todayCostUsd: number; model: string; configured: boolean };
type Analytics = { stats: Stats; period: Period; ai: Ai; periodDays: number };

const usd = (value: number) => `$${value.toFixed(value >= 1 ? 2 : 3)}`;

/** How the assistant is doing, in counts the owner can check at a glance. Test chats are left out. */
export function AnalyticsTab() {
  const { t } = useI18n();
  const { setParams } = useAdminNav();
  const [days, setDays] = useState<"7" | "30">("7");
  const [data, setData] = useState<Analytics>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    async function run() {
      try {
        const { data: body } = await api.get("/chatbot/admin/analytics", { params: { days }, signal: controller.signal });
        if (controller.signal.aborted) return;
        if (!body?.stats || !body?.period) throw new Error("Missing analytics");
        setData(body); setError(false);
      } catch { if (!controller.signal.aborted) setError(true); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void run();
    return () => controller.abort();
  }, [reload, days]);
  const refresh = <button type="button" disabled={loading} className="btn-secondary btn-sm" onClick={() => setReload((value) => value + 1)}><RefreshCw aria-hidden size={14} className={loading ? "animate-spin" : ""} />{t("common.refresh")}</button>;
  if (loading && !data) return <div className="admin-surface"><LoadingRows rows={3} rowClassName="h-[80px]" /></div>;
  if (error && !data) return <ErrorState message={t("activity.errors.load_failed")} onRetry={() => setReload((value) => value + 1)} />;
  if (!data) return null;
  const { stats, period, ai } = data;
  const waiting = Math.max(0, stats.needsHuman - stats.paused);
  const reasons = Object.entries(period.leadsByReason).sort((a, b) => b[1] - a[1]);
  const kindLabel = (kind: string) => kind.startsWith("unpublished_fact:")
    ? t("activity.kind.unpublished", { topic: t(`activity.topic.${kind.slice("unpublished_fact:".length)}`, undefined, kind.slice("unpublished_fact:".length)) })
    : t(kind === "ai_error" ? "activity.kind.ai_error" : "activity.kind.unanswered");
  const maxDay = Math.max(1, ...ai.byDay.map((day) => day.estCostUsd));
  return <div className="space-y-[16px]">
    <div className="flex flex-wrap items-center justify-between gap-[12px]">
      <p className="max-w-3xl text-[13px] leading-relaxed text-taupe">{t("activity.hint")}</p>
      <div className="flex flex-wrap items-center gap-[8px]">
        <Segmented label={t("activity.period_label")} value={days} onChange={setDays} options={[{ value: "7", label: t("activity.period_7") }, { value: "30", label: t("activity.period_30") }]} />
        {refresh}
      </div>
    </div>
    <div className="grid grid-cols-2 gap-[12px] md:grid-cols-3 xl:grid-cols-4">
      <StatCard label={t("activity.stats.started")} value={period.conversationsStarted} hint={t("activity.stats.started_hint")} />
      <StatCard label={t("activity.stats.messages")} value={period.customerMessages} hint={t("activity.stats.messages_hint", { count: period.assistantMessages })} />
      <StatCard label={t("activity.stats.purchase")} value={period.purchaseIntent} hint={t("activity.stats.purchase_hint")} />
      <StatCard label={t("activity.stats.links")} value={period.checkoutLinks} hint={t("activity.stats.links_hint")} />
      <StatCard label={t("activity.stats.chat_orders")} value={period.ordersFromChat} hint={t("activity.stats.chat_orders_hint", { started: period.chatOrdersStarted })} hintTone={period.ordersFromChat ? "good" : "muted"} />
      <StatCard label={t("activity.stats.handovers")} value={period.handovers} hint={t("activity.stats.handovers_hint")} />
      <StatCard label={t("activity.stats.unanswered")} value={period.unanswered} hint={t("activity.stats.unanswered_hint")} hintTone={period.unanswered ? "bad" : "muted"} />
      <StatCard label={t("activity.stats.waiting")} value={waiting} hint={t("activity.stats.waiting_hint")} hintTone={waiting ? "bad" : "muted"} />
    </div>

    <div className="grid gap-[16px] xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]">
      <Panel title={t("activity.unanswered_title")} description={t("activity.unanswered_hint")}>
        {period.unansweredQuestions.length === 0 ? <EmptyState icon={MessageSquare} title={t("activity.unanswered_empty")} className="py-[24px]" /> : (
          <ul className="divide-y divide-ink/10">
            {period.unansweredQuestions.map((item, index) => (
              <li key={`${item.conversationId}-${index}`} className="flex flex-wrap items-start justify-between gap-[10px] px-[16px] py-[12px] md:px-[20px]">
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] text-ink">{item.text}</p>
                  <p className="mt-[4px] text-[12px] text-taupe">{formatDateTime(item.at)} · {kindLabel(item.kind)}</p>
                </div>
                <button type="button" className="btn-ghost btn-sm" onClick={() => setParams({ chat: item.conversationId })}>{t("activity.open_chat")}</button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title={t("activity.reasons_title")} description={t("activity.reasons_hint")} bodyClassName="px-[16px] md:px-[20px]">
        {reasons.length ? <dl className="divide-y divide-ink/10">{reasons.map(([reason, count]) => <div key={reason} className="flex items-center justify-between gap-[12px] py-[10px]"><dt className="text-[14px] text-taupe">{t(reasonKey(reason))}</dt><dd className="text-[16px] font-medium tabular-nums">{count}</dd></div>)}</dl> : <p className="py-[16px] text-[13px] leading-relaxed text-taupe">{t("activity.reasons_empty")}</p>}
      </Panel>
    </div>

    <Panel title={t("activity.ai_title")} description={t("activity.ai_hint")} action={ai.configured ? <StatusPill tone="neutral">{t("activity.ai.model")}: {ai.model}</StatusPill> : <StatusPill tone="attention">{t("activity.ai.off")}</StatusPill>} bodyClassName="space-y-[16px] p-[16px] md:p-[20px]">
      <div className="grid grid-cols-2 gap-[12px] md:grid-cols-4">
        <StatCard label={t("activity.ai.calls")} value={ai.calls} hint={t("activity.ai.tokens")} />
        <StatCard label={t("activity.ai.cost")} value={usd(ai.estCostUsd)} hint={ai.budgetUsd > 0 ? t("activity.ai.today", { cost: ai.todayCostUsd.toFixed(2), budget: ai.budgetUsd }) : t("activity.ai.today_unlimited", { cost: ai.todayCostUsd.toFixed(2) })} hintTone={ai.budgetUsd > 0 && ai.todayCostUsd >= ai.budgetUsd ? "bad" : "muted"} />
        <StatCard label={t("activity.ai.latency")} value={period.avgDurationMs ? `${(period.avgDurationMs / 1000).toFixed(1)} s` : "—"} hint={t("activity.ai.latency_hint", { p95: period.p95DurationMs })} />
        <StatCard label={t("activity.ai.failures")} value={ai.failures} hint={t("activity.ai.failures_hint", { count: ai.rejectedReplies })} hintTone={ai.failures ? "bad" : "muted"} />
      </div>
      {ai.byModel.length === 0 ? <Notice>{t("activity.ai.no_usage")}</Notice> : (
        <div className="grid gap-[16px] md:grid-cols-2">
          <div>
            <p className="mb-[8px] text-[13px] font-medium text-taupe">{t("activity.ai.by_model")}</p>
            <table className="w-full text-left text-[13px]"><thead className="text-taupe"><tr><th className="py-[4px] font-medium">{t("activity.ai.model")}</th><th className="py-[4px] text-right font-medium">{t("activity.ai.calls")}</th><th className="py-[4px] text-right font-medium">{t("activity.ai.tokens")}</th><th className="py-[4px] text-right font-medium">{t("activity.ai.cost")}</th></tr></thead>
              <tbody className="divide-y divide-ink/10">{ai.byModel.map((row) => <tr key={row.model}><td className="py-[6px] font-mono text-[12px]">{row.model}</td><td className="py-[6px] text-right tabular-nums">{row.calls}</td><td className="py-[6px] text-right tabular-nums">{row.promptTokens.toLocaleString("en-US")} / {row.completionTokens.toLocaleString("en-US")}</td><td className="py-[6px] text-right tabular-nums">{usd(row.estCostUsd)}</td></tr>)}</tbody></table>
          </div>
          <div>
            <p className="mb-[8px] text-[13px] font-medium text-taupe">{t("activity.ai.by_day")}</p>
            <ul className="space-y-[6px]">{ai.byDay.map((day) => <li key={day.day} className="grid grid-cols-[56px_minmax(0,1fr)_64px] items-center gap-[10px] text-[12px]"><time dateTime={day.day} className="tabular-nums text-taupe">{day.day.slice(5).replace("-", ".")}</time><div className="h-[16px] bg-paper"><div className="h-full bg-espresso" style={{ width: `${(day.estCostUsd / maxDay) * 100}%` }} /></div><span className="text-right tabular-nums">{usd(day.estCostUsd)}</span></li>)}</ul>
          </div>
        </div>
      )}
    </Panel>

    <div className="grid gap-[16px] xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)]">
      <Panel title={t("activity.by_day")} description={t("activity.by_day_hint")} bodyClassName="p-[16px] md:p-[20px]">
        {stats.leadsByDay.some((day) => day.count > 0) ? <ul className="space-y-[8px]">{stats.leadsByDay.map((day) => <li key={day.date} className="grid grid-cols-[56px_minmax(0,1fr)_32px] items-center gap-[10px] text-[12px]"><time dateTime={day.date} className="tabular-nums text-taupe">{day.date.slice(5).replace("-", ".")}</time><div className="h-[18px] bg-paper"><div className="h-full bg-espresso" style={{ width: `${(day.count / Math.max(1, ...stats.leadsByDay.map((item) => item.count))) * 100}%` }} /></div><span className="text-right text-[13px] tabular-nums">{day.count}</span></li>)}</ul> : <EmptyState icon={BarChart3} title={t("activity.no_activity")} description={t("activity.no_activity_hint")} className="py-[24px]" />}
      </Panel>
      <Panel title={t("activity.channels")} bodyClassName="px-[16px] md:px-[20px]">
        {Object.keys(stats.conversationsByChannel).length ? <dl className="divide-y divide-ink/10">{Object.entries(stats.conversationsByChannel).map(([channel, count]) => <div key={channel} className="flex items-center justify-between gap-[12px] py-[12px]"><dt className="text-[14px] text-taupe">{t(`chat.channel.${channel}`, undefined, channel)}</dt><dd className="text-[18px] font-medium tabular-nums">{count}</dd></div>)}</dl> : <p className="py-[16px] text-[13px] leading-relaxed text-taupe">{t("activity.no_channels")}</p>}
      </Panel>
    </div>
  </div>;
}
