"use client";
import { useEffect, useState } from "react";
import { ArrowRight, RefreshCw } from "lucide-react";
import { api } from "@admin/lib/api";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { Panel } from "@admin/components/ui/page";
import { StatCard, StatusPill } from "@admin/components/ui/status";
import { ErrorState, LoadingRows, Notice } from "@admin/components/ui/feedback";
import { formatDateTime } from "@admin/utils/format";

type Overview = {
  periodDays: number;
  stats: { totalContacts: number; needsHuman: number; paused: number; newLeads: number };
  period: { activeConversations: number; conversationsStarted: number; customerMessages: number; unanswered: number; handovers: number; purchaseIntent: number; checkoutLinks: number; ordersFromChat: number; ordersFromChatPaid: number };
  ai: { calls: number; estCostUsd: number; budgetUsd: number; todayCostUsd: number; model: string; configured: boolean; failures: number };
  reservations?: { active: number; minutes: number; maxActivePerPhone: number; maxQuantityPerItem: number; lastJobRuns: Array<{ trigger: string; startedAt: string; finishedAt: string | null; ok: boolean; processed: number; error: string | null }> };
};

const usd = (value: number) => `$${value.toFixed(value >= 1 ? 2 : 3)}`;

/** The AI Chatbot at a glance: conversations, what needs a person, sales help, cost, and whether the cleanup job runs. */
export function ChatbotOverview({ onOpen }: { onOpen: (tab: string, extra?: Record<string, string | null>) => void }) {
  const { t } = useI18n();
  const [data, setData] = useState<Overview>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    api.get("/chatbot/admin/analytics", { params: { days: 7 }, signal: controller.signal })
      .then(({ data: body }) => { if (!controller.signal.aborted) { setData(body); setError(false); } })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);
  if (loading && !data) return <div className="admin-surface"><LoadingRows rows={3} rowClassName="h-[80px]" /></div>;
  if (error && !data) return <ErrorState message={t("activity.errors.load_failed")} onRetry={() => setReload((value) => value + 1)} />;
  if (!data) return null;
  const { stats, period, ai, reservations } = data;
  const waiting = Math.max(0, stats.needsHuman - stats.paused);
  const lastRun = reservations?.lastJobRuns?.[0];
  const link = (tab: string, label: string, extra?: Record<string, string | null>) => <button type="button" className="btn-ghost btn-sm" onClick={() => onOpen(tab, extra)}>{label}<ArrowRight aria-hidden className="h-[14px] w-[14px]" /></button>;
  return <div className="space-y-[16px]">
    <div className="flex flex-wrap items-center justify-between gap-[12px]">
      <p className="max-w-3xl text-[13px] leading-relaxed text-taupe">{t("chatbot_overview.hint")}</p>
      <button type="button" disabled={loading} className="btn-secondary btn-sm" onClick={() => setReload((value) => value + 1)}><RefreshCw aria-hidden size={14} className={loading ? "animate-spin" : ""} />{t("common.refresh")}</button>
    </div>
    <div className="grid grid-cols-2 gap-[12px] md:grid-cols-3 xl:grid-cols-4">
      <StatCard label={t("chatbot_overview.total")} value={stats.totalContacts} hint={t("chatbot_overview.total_hint")} />
      <StatCard label={t("chatbot_overview.active")} value={period.activeConversations} hint={t("chatbot_overview.active_hint", { started: period.conversationsStarted })} />
      <StatCard label={t("activity.stats.unanswered")} value={period.unanswered} hint={t("activity.stats.unanswered_hint")} hintTone={period.unanswered ? "bad" : "muted"} onClick={() => onOpen("analytics")} actionLabel={t("chatbot_overview.see")} />
      <StatCard label={t("activity.stats.handovers")} value={period.handovers} hint={t("chatbot_overview.waiting", { count: waiting })} hintTone={waiting ? "bad" : "muted"} onClick={() => onOpen("conversations", { filter: "attention" })} actionLabel={t("chatbot_overview.open_chats")} />
      <StatCard label={t("activity.stats.purchase")} value={period.purchaseIntent} hint={t("chatbot_overview.links", { count: period.checkoutLinks })} />
      <StatCard label={t("activity.stats.chat_orders")} value={period.ordersFromChat} hint={t("chatbot_overview.paid", { count: period.ordersFromChatPaid })} hintTone={period.ordersFromChatPaid ? "good" : "muted"} />
      <StatCard label={t("activity.ai.cost")} value={usd(ai.estCostUsd)} hint={ai.budgetUsd > 0 ? t("activity.ai.today", { cost: ai.todayCostUsd.toFixed(2), budget: ai.budgetUsd }) : t("activity.ai.today_unlimited", { cost: ai.todayCostUsd.toFixed(2) })} hintTone={ai.budgetUsd > 0 && ai.todayCostUsd >= ai.budgetUsd ? "bad" : "muted"} onClick={() => onOpen("analytics")} actionLabel={t("chatbot_overview.see")} />
      <StatCard label={t("activity.ai.model")} value={ai.configured ? ai.model : "—"} hint={ai.configured ? t("chatbot_overview.model_hint", { calls: ai.calls }) : t("activity.ai.off")} hintTone={ai.configured ? "muted" : "bad"} onClick={() => onOpen("settings")} actionLabel={t("chatbot_overview.change")} />
    </div>
    <div className="grid gap-[16px] xl:grid-cols-2">
      <Panel title={t("chatbot_overview.reservations_title")} description={t("chatbot_overview.reservations_hint")} bodyClassName="space-y-[10px] p-[16px] md:p-[20px]" action={link("settings", t("chatbot_overview.change"))}>
        {reservations ? <>
          <div className="grid grid-cols-2 gap-[12px] md:grid-cols-4">
            <StatCard label={t("chatbot_overview.active_reservations")} value={reservations.active} />
            <StatCard label={t("assistant.fields.chatReservationMinutes")} value={`${reservations.minutes} ${t("chatbot_overview.minutes")}`} />
            <StatCard label={t("assistant.fields.chatMaxActiveReservationsPerPhone")} value={reservations.maxActivePerPhone} />
            <StatCard label={t("assistant.fields.chatMaxQuantityPerItem")} value={reservations.maxQuantityPerItem} />
          </div>
          {lastRun ? (
            <p className="text-[13px] leading-relaxed text-taupe">
              <StatusPill tone={lastRun.ok ? "success" : "danger"}>{t(lastRun.ok ? "chatbot_overview.job_ok" : "chatbot_overview.job_failed")}</StatusPill>
              {" "}{t("chatbot_overview.job_last", { when: formatDateTime(lastRun.startedAt), trigger: lastRun.trigger, count: lastRun.processed })}
              {lastRun.error ? ` · ${lastRun.error}` : ""}
            </p>
          ) : <Notice>{t("chatbot_overview.job_none")}</Notice>}
        </> : <Notice>{t("chatbot_overview.job_none")}</Notice>}
      </Panel>
      <Panel title={t("chatbot_overview.shortcuts")} bodyClassName="grid gap-[8px] p-[16px] md:p-[20px]">
        {link("conversations", t("chatbot_overview.go_conversations"))}
        {link("knowledge", t("chatbot_overview.go_knowledge"))}
        {link("settings", t("chatbot_overview.go_settings"))}
        {link("analytics", t("chatbot_overview.go_analytics"))}
        {link("activity", t("chatbot_overview.go_activity"))}
        {link("test", t("chatbot_overview.go_test"))}
      </Panel>
    </div>
  </div>;
}
