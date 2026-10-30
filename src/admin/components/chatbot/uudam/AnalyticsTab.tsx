"use client";
import { useEffect, useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import { api } from "@admin/lib/api";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { StatCard } from "@admin/components/ui/status";
import { Panel } from "@admin/components/ui/page";
import { EmptyState, ErrorState, LoadingRows } from "@admin/components/ui/feedback";

type AnalyticsStatsData = { totalContacts: number; needsHuman: number; paused: number; totalLeads: number; newLeads: number; conversationsByChannel: Record<string, number>; leadsByDay: Array<{ date: string; count: number }> };

/** How the assistant is doing, in counts the owner can check at a glance. Test chats are left out. */
export function AnalyticsTab() {
  const { t } = useI18n();
  const [stats, setStats] = useState<AnalyticsStatsData>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    async function run() {
      try {
        const { data } = await api.get("/chatbot/admin/analytics", { signal: controller.signal });
        if (controller.signal.aborted) return;
        if (!data?.stats) throw new Error("Missing analytics");
        setStats(data.stats); setError(false);
      } catch { if (!controller.signal.aborted) setError(true); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void run();
    return () => controller.abort();
  }, [reload]);
  const refresh = <button type="button" disabled={loading} className="btn-secondary btn-sm" onClick={() => setReload((value) => value + 1)}><RefreshCw aria-hidden size={14} className={loading ? "animate-spin" : ""} />{t("common.refresh")}</button>;
  if (loading && !stats) return <div className="admin-surface"><LoadingRows rows={3} rowClassName="h-[80px]" /></div>;
  if (error && !stats) return <ErrorState message={t("activity.errors.load_failed")} onRetry={() => setReload((value) => value + 1)} />;
  if (!stats) return null;
  const maxCount = Math.max(1, ...stats.leadsByDay.map((day) => day.count));
  const hasActivity = stats.leadsByDay.some((day) => day.count > 0);
  const waiting = Math.max(0, stats.needsHuman - stats.paused);
  return <div className="space-y-[16px]">
    <div className="flex flex-wrap items-center justify-between gap-[12px]"><p className="max-w-3xl text-[13px] leading-relaxed text-taupe">{t("activity.hint")}</p>{refresh}</div>
    <div className="grid grid-cols-2 gap-[12px] md:grid-cols-3 xl:grid-cols-5">
      <StatCard label={t("activity.stats.conversations")} value={stats.totalContacts} hint={t("activity.stats.conversations_hint")} />
      <StatCard label={t("activity.stats.waiting")} value={waiting} hint={t("activity.stats.waiting_hint")} hintTone={waiting ? "bad" : "muted"} />
      <StatCard label={t("activity.stats.handled")} value={stats.paused} hint={t("activity.stats.handled_hint")} />
      <StatCard label={t("activity.stats.requests")} value={stats.totalLeads} hint={t("activity.stats.requests_hint")} />
      <StatCard label={t("activity.stats.new_requests")} value={stats.newLeads} hint={t("activity.stats.new_requests_hint")} hintTone={stats.newLeads ? "bad" : "muted"} />
    </div>
    <div className="grid gap-[16px] xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)]">
      <Panel title={t("activity.by_day")} description={t("activity.by_day_hint")} bodyClassName="p-[16px] md:p-[20px]">
        {hasActivity ? <ul className="space-y-[8px]">{stats.leadsByDay.map((day) => <li key={day.date} className="grid grid-cols-[56px_minmax(0,1fr)_32px] items-center gap-[10px] text-[12px]"><time dateTime={day.date} className="tabular-nums text-taupe">{day.date.slice(5).replace("-", ".")}</time><div className="h-[18px] bg-paper"><div className="h-full bg-espresso" style={{ width: `${day.count / maxCount * 100}%` }} /></div><span className="text-right text-[13px] tabular-nums">{day.count}</span></li>)}</ul> : <EmptyState icon={BarChart3} title={t("activity.no_activity")} description={t("activity.no_activity_hint")} className="py-[24px]" />}
      </Panel>
      <Panel title={t("activity.channels")} bodyClassName="px-[16px] md:px-[20px]">
        {Object.keys(stats.conversationsByChannel).length ? <dl className="divide-y divide-ink/10">{Object.entries(stats.conversationsByChannel).map(([channel, count]) => <div key={channel} className="flex items-center justify-between gap-[12px] py-[12px]"><dt className="text-[14px] text-taupe">{t(`chat.channel.${channel}`, undefined, channel)}</dt><dd className="text-[18px] font-medium tabular-nums">{count}</dd></div>)}</dl> : <p className="py-[16px] text-[13px] leading-relaxed text-taupe">{t("activity.no_channels")}</p>}
      </Panel>
    </div>
  </div>;
}
