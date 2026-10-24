"use client";
import { useEffect, useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import { api } from "@admin/lib/api";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { LoadingPanel, StatCard } from "./AdminShared";
import { useSupportCopy } from "../supportCopy";
import { button } from "../types";

type AnalyticsStatsData = { totalContacts: number; needsHuman: number; paused: number; totalLeads: number; newLeads: number; conversationsByChannel: Record<string, number>; leadsByDay: Array<{ date: string; count: number }> };

export function AnalyticsTab() {
  const { t } = useI18n();
  const copy = useSupportCopy();
  const [stats, setStats] = useState<AnalyticsStatsData>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    async function run() {
      try {
        const { data } = await api.get("/chatbot/admin/analytics", { signal: controller.signal });
        if (controller.signal.aborted) return;
        if (!data?.stats) throw new Error("Missing analytics");
        setStats(data.stats); setError("");
      } catch { if (!controller.signal.aborted) setError(t("chatbot.error")); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void run();
    return () => controller.abort();
  }, [t, reload]);
  const refresh = <button type="button" disabled={loading} className={`${button} inline-flex items-center gap-2`} onClick={() => setReload((value) => value + 1)}><RefreshCw size={15} className={loading ? "animate-spin" : ""} />{t("refresh")}</button>;
  if (loading) return <LoadingPanel />;
  if (error) return <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border border-terracotta/30 bg-white p-5 text-sm text-terracotta"><p>{error}</p>{refresh}</div>;
  if (!stats) return null;
  const maxCount = Math.max(1, ...stats.leadsByDay.map((day) => day.count));
  const hasActivity = stats.leadsByDay.some((day) => day.count > 0);
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-3xl text-sm leading-relaxed text-taupe">{copy.statsHint}</p>{refresh}</div>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">{([["total_contacts", stats.totalContacts], ["total_leads", stats.totalLeads], ["new", stats.newLeads], ["needs_human", stats.needsHuman], ["take_over", stats.paused]] as Array<[string, number]>).map(([label, value]) => <StatCard key={label} label={t(`chatbot.${label}`)} value={value} />)}</div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)]">
      <section className="border border-ink/15 bg-white p-5 sm:p-6"><h2 className="text-base font-semibold">{copy.activity}</h2>{hasActivity ? <div className="mt-6 space-y-3">{stats.leadsByDay.map((day) => <div key={day.date} className="grid grid-cols-[80px_minmax(0,1fr)_32px] items-center gap-3 text-xs"><time dateTime={day.date} className="tabular-nums text-taupe">{day.date.slice(5)}</time><div className="h-5 bg-paper"><div className="h-full bg-espresso" style={{ width: `${day.count / maxCount * 100}%` }} /></div><span className="text-right text-sm tabular-nums">{day.count}</span></div>)}</div> : <div className="flex min-h-60 flex-col items-center justify-center py-8 text-center"><BarChart3 size={30} strokeWidth={1.3} className="mb-5 text-taupe" /><h3 className="text-base font-medium">{copy.noActivity}</h3><p className="mt-2 max-w-sm text-sm leading-relaxed text-taupe">{copy.noActivityHint}</p></div>}</section>
      <section className="border border-ink/15 bg-white p-5 sm:p-6"><h2 className="text-base font-semibold">{copy.channels}</h2>{Object.keys(stats.conversationsByChannel).length ? <dl className="mt-5 divide-y divide-ink/10">{Object.entries(stats.conversationsByChannel).map(([channel, count]) => <div key={channel} className="flex items-center justify-between gap-3 py-4"><dt className="text-sm capitalize text-taupe">{channel}</dt><dd className="text-xl tabular-nums">{count}</dd></div>)}</dl> : <p className="py-8 text-sm leading-relaxed text-taupe">{copy.noChannels}</p>}</section>
    </div>
  </div>;
}
