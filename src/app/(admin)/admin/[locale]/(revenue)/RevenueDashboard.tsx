"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, ChevronRight, RefreshCw } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { useAdminNav } from "@admin/lib/adminNav";
import { api } from "@admin/lib/api";
import { PageHeader, Panel } from "@admin/components/ui/page";
import { StatCard } from "@admin/components/ui/status";
import { Segmented } from "@admin/components/ui/controls";
import { EmptyState, ErrorState, LoadingRows, Notice } from "@admin/components/ui/feedback";
import { calcTrend } from "@admin/utils/revenue";
import { formatMNT, formatMNTCompact, formatShortDate, formatWhen, ubDayKey } from "@admin/utils/format";
import { cn } from "@admin/lib/utils";
import { OrderStatusPill } from "../(orders)/components/OrderDetails";
import { OrderStatus } from "../(orders)/components/type";

type Stats = { totalRevenue: number; weeklyRevenue: number; monthlyRevenue: number };
type Day = { date: string; revenue: number; orders: number };
type Payment = { id: string; orderId: string; amount: number; status: string; createdAt: string };
type Range = "7" | "30";

/** Last `days` days ending today (Ulaanbaatar), with zero-filled gaps. */
function fillDays(data: Day[], days: number, offsetDays = 0): Day[] {
  const byDate = new Map(data.map((d) => [d.date, d]));
  const out: Day[] = [];
  for (let i = days - 1 + offsetDays; i >= offsetDays; i--) {
    const key = ubDayKey(new Date(Date.now() - i * 86_400_000));
    out.push(byDate.get(key) ?? { date: key, revenue: 0, orders: 0 });
  }
  return out;
}

const sum = (days: Day[], k: "revenue" | "orders") => days.reduce((s, d) => s + (d[k] || 0), 0);

function ChartTooltip({ active, payload, t }: { active?: boolean; payload?: { payload: Day }[]; t: (k: string, p?: Record<string, string | number>) => string }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="border border-ink/10 bg-white px-[12px] py-[10px] text-[12px] shadow-[0_8px_24px_rgba(28,23,20,0.08)]">
      <p className="text-taupe">{d.date.replace(/-/g, ".")}</p>
      <p className="mt-[4px] text-[14px] font-medium tabular-nums text-ink">{formatMNT(d.revenue)}</p>
      <p className="tabular-nums text-taupe">{t("revenue.orders_count", { count: d.orders })}</p>
    </div>
  );
}

export default function RevenueDashboard() {
  const { t } = useI18n();
  const { go } = useAdminNav();
  const [stats, setStats] = useState<Stats | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [chartData, setChartData] = useState<Day[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [range, setRange] = useState<Range>("7");
  const request = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setFailed(false);
    try {
      const { data } = await api.get("/order", { params: { mode: "revenue" }, signal: controller.signal });
      if (controller.signal.aborted) return;
      setStats(data?.stats ?? null);
      setPayments(Array.isArray(data?.payments) ? data.payments : []);
      setChartData(
        (Array.isArray(data?.chartData) ? data.chartData : []).map((d: Partial<Day>) => ({
          date: String(d.date),
          revenue: Number(d.revenue) || 0,
          orders: Number(d.orders) || 0,
        }))
      );
    } catch {
      if (!controller.signal.aborted) setFailed(true);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return () => request.current?.abort();
  }, [load]);

  const days = Number(range);
  const current = useMemo(() => fillDays(chartData, days), [chartData, days]);
  const previous = useMemo(() => fillDays(chartData, days, days), [chartData, days]);

  const revenue = sum(current, "revenue");
  const orders = sum(current, "orders");
  const avg = orders ? revenue / orders : 0;
  const priorRevenue = sum(previous, "revenue");
  const trend = calcTrend(revenue, priorRevenue);
  const noData = failed && !stats;
  const when = (iso?: string) => formatWhen(iso, { today: t("common.today"), yesterday: t("common.yesterday") });

  const trendText =
    priorRevenue === 0
      ? t(revenue === 0 ? "revenue.trend.none" : "revenue.trend.no_compare")
      : trend.direction === "flat"
      ? t("revenue.trend.same", { days })
      : t(trend.direction === "up" ? "revenue.trend.up" : "revenue.trend.down", { pct: trend.value, days });

  return (
    <div className="w-full space-y-[20px]">
      <PageHeader
        title={t("revenue.title")}
        description={t("revenue.description")}
        actions={
          <>
            <Segmented
              label={t("revenue.range")}
              value={range}
              onChange={setRange}
              options={[{ value: "7", label: t("revenue.days_7") }, { value: "30", label: t("revenue.days_30") }]}
            />
            <button type="button" onClick={() => void load()} disabled={loading} className="btn-secondary">
              <RefreshCw aria-hidden className={cn("h-[15px] w-[15px]", loading && "animate-spin")} />
              {t("common.refresh")}
            </button>
          </>
        }
      />

      {failed && <ErrorState message={t("revenue.errors.load_failed")} onRetry={() => void load()} retrying={loading} />}

      <section aria-label={t("revenue.summary_label")} className="grid grid-cols-2 gap-[12px] lg:grid-cols-4">
        <StatCard
          label={t(range === "7" ? "revenue.stats.sales_7" : "revenue.stats.sales_30")}
          value={noData ? "—" : formatMNT(revenue)}
          hint={noData ? undefined : trendText}
          hintTone={priorRevenue === 0 ? "muted" : trend.direction === "up" ? "good" : trend.direction === "down" ? "bad" : "muted"}
          loading={loading}
        />
        <StatCard label={t("revenue.stats.orders")} value={noData ? "—" : String(orders)} hint={t("revenue.stats.orders_hint")} loading={loading} />
        <StatCard label={t("revenue.stats.average")} value={noData ? "—" : formatMNT(avg)} hint={t("revenue.stats.average_hint")} loading={loading} />
        <StatCard
          label={t("revenue.stats.month")}
          value={noData ? "—" : formatMNT(stats?.monthlyRevenue)}
          hint={noData ? undefined : t("revenue.stats.all_time", { amount: formatMNT(stats?.totalRevenue) })}
          loading={loading}
        />
      </section>

      <Panel
        title={t(range === "7" ? "revenue.chart.title_7" : "revenue.chart.title_30")}
        description={current.length ? `${current[0].date.replace(/-/g, ".")} — ${current[current.length - 1].date.replace(/-/g, ".")} · ${t("common.timezone_short")}` : undefined}
        bodyClassName="px-[12px] py-[16px] md:px-[20px]"
      >
        <div className="h-[260px]">
          {loading ? (
            <LoadingRows rows={1} className="h-full p-0" rowClassName="h-full" />
          ) : noData ? (
            <p className="flex h-full items-center justify-center text-[14px] text-taupe">{t("revenue.errors.load_failed")}</p>
          ) : revenue > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={current} margin={{ top: 8, right: 0, bottom: 0, left: 0 }} barCategoryGap={range === "7" ? "28%" : "18%"} accessibilityLayer>
                <CartesianGrid vertical={false} stroke="rgba(28,23,20,0.08)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatShortDate}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(28,23,20,0.2)" }}
                  tick={{ fontSize: 11, fill: "#6f655d" }}
                  interval={range === "7" ? 0 : "preserveStartEnd"}
                  minTickGap={12}
                />
                <YAxis tickFormatter={formatMNTCompact} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#6f655d" }} width={52} />
                <Tooltip cursor={{ fill: "rgba(239,231,221,0.7)" }} content={<ChartTooltip t={t} />} />
                <Bar dataKey="revenue" name={t("revenue.chart.series")} fill="#1c1714" radius={0} maxBarSize={44} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              className="h-full justify-center border border-dashed border-ink/15 bg-paper/60"
              icon={BarChart3}
              title={t("revenue.empty.title")}
              description={t("revenue.empty.body")}
              action={<button type="button" className="btn-secondary" onClick={() => go("orders")}>{t("revenue.empty.action")}</button>}
            />
          )}
        </div>
      </Panel>

      <Notice title={t("revenue.rule.title")}>{t("revenue.rule.body")}</Notice>

      <Panel title={t("revenue.recent.title")} description={t("revenue.recent.description")}>
        {loading ? (
          <LoadingRows rows={4} rowClassName="h-[44px]" />
        ) : noData ? (
          <p className="p-[20px] text-center text-[14px] text-taupe">{t("revenue.errors.load_failed")}</p>
        ) : payments.length ? (
          <ul className="divide-y divide-ink/10">
            {payments.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => go("orders", { order: p.id })} className="flex w-full items-center justify-between gap-[12px] px-[16px] py-[12px] text-left transition-colors hover:bg-paper md:px-[20px]">
                  <span className="min-w-0">
                    <span className="block text-[14px] font-medium text-ink">#{p.orderId}</span>
                    <span className="block text-[12px] tabular-nums text-taupe">{when(p.createdAt)}</span>
                  </span>
                  <span className="flex items-center gap-[12px]">
                    <span className="hidden sm:block"><OrderStatusPill order={{ id: p.id, status: p.status as OrderStatus }} t={t} /></span>
                    <span className="w-[100px] text-right text-[14px] font-medium tabular-nums text-ink">{formatMNT(p.amount)}</span>
                    <ChevronRight aria-hidden className="h-[16px] w-[16px] text-ink/40" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={t("revenue.recent.empty_title")} description={t("revenue.recent.empty_body")} />
        )}
      </Panel>
    </div>
  );
}
