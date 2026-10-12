"use client";
import { useEffect, useState } from "react";
import { api } from "@admin/lib/api";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { LoadingPanel, StatCard } from "./AdminShared";
type AnalyticsStatsData = { totalContacts: number; needsHuman: number; paused: number; totalLeads: number; newLeads: number; conversationsByChannel: Record<string, number>; leadsByDay: Array<{ date: string; count: number }> };
// Copied cache + cancellation-aware load survives tab switches.
let analyticsCache: AnalyticsStatsData | null = null;
export function AnalyticsTab() {
  const { t } = useI18n();
  const [stats, setStats] = useState<AnalyticsStatsData | null>(analyticsCache);
  const [loading, setLoading] = useState(analyticsCache == null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const { data } = await api.get("/chatbot/admin/analytics");
        if (cancelled) return;
        analyticsCache = data.stats; setStats(data.stats); setError("");
      } catch { if (!cancelled) setError(t("chatbot.error")); }
      finally { if (!cancelled) setLoading(false); }
    }
    void run(); return () => { cancelled = true; };
  }, [t]);
  if (loading) return <LoadingPanel />;
  if (error) return <p role="alert" className="text-sm text-terracotta">{error}</p>;
  if (!stats) return null;
  const maxCount = Math.max(1, ...stats.leadsByDay.map((d) => d.count));
  return <div className="space-y-5"><div className="grid gap-3 sm:grid-cols-3">{([ ["total_contacts", stats.totalContacts], ["total_leads", stats.totalLeads], ["new", stats.newLeads], ["needs_human", stats.needsHuman], ["take_over", stats.paused] ] as Array<[string, number]>).map(([label, value]) => <StatCard key={label} label={t(`chatbot.${label}`)} value={value} />)}</div><div className="border border-ink/10 bg-white p-4"><p className="text-sm">{t("chatbot.leads_by_day")}</p><div className="mt-4 flex h-32 items-end gap-3">{stats.leadsByDay.map((d) => <div key={d.date} className="flex flex-1 flex-col items-center gap-1 text-xs" title={`${d.date}: ${d.count}`}><span>{d.count}</span><div className="w-full bg-terracotta/60" style={{ height: `${Math.max(4, d.count / maxCount * 80)}px` }} /><span>{d.date.slice(5)}</span></div>)}</div></div><div className="flex flex-wrap gap-3 border border-ink/10 bg-white p-4">{Object.entries(stats.conversationsByChannel).map(([channel, count]) => <span key={channel} className="text-sm">{channel}: {count}</span>)}</div></div>;
}
