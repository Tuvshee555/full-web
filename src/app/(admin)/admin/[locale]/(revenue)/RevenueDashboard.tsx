"use client";

import { API_BASE_URL } from "@admin/lib/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { useAuth } from "@admin/provider/AuthProvider";
import { Skeleton } from "@admin/components/ui/skeleton";
import { calcTrend } from "@admin/utils/revenue";
import { formatDateTime, formatMNT, formatMNTCompact, formatShortDate, ubDayKey } from "@admin/utils/format";
import { StatusBadge } from "../(orders)/components/OrderDetails";
import { OrderStatus } from "../(orders)/components/type";

type Stats = { totalRevenue: number; weeklyRevenue: number; monthlyRevenue: number };
type Day = { date: string; revenue: number; orders: number };
type Payment = { id: string; orderId: string; amount: number; status: string; createdAt: string };
type Range = 7 | 30;

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

function ChartTooltip({ active, payload, t }: { active?: boolean; payload?: { payload: Day }[]; t: (k: string) => string }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="border border-ink/10 bg-white px-[12px] py-[10px] text-[12px] shadow-[0_8px_24px_rgba(28,23,20,0.08)]">
      <p className="text-taupe">{d.date.replace(/-/g, ".")}</p>
      <p className="mt-[4px] text-[14px] font-medium tabular-nums text-ink">{formatMNT(d.revenue)}</p>
      <p className="tabular-nums text-taupe">
        {d.orders} {t("revenue_ui.orders_short")}
      </p>
    </div>
  );
}

export default function RevenueDashboard() {
  const { t } = useI18n();
  const { token } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [chartData, setChartData] = useState<Day[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [range, setRange] = useState<Range>(7);
  const request = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch(`${API_BASE_URL}/order?mode=revenue`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
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
  }, [token]);

  useEffect(() => {
    load();
    return () => request.current?.abort();
  }, [load]);

  const current = useMemo(() => fillDays(chartData, range), [chartData, range]);
  const previous = useMemo(() => fillDays(chartData, range, range), [chartData, range]);

  const revenue = sum(current, "revenue");
  const orders = sum(current, "orders");
  const avg = orders ? revenue / orders : 0;
  const trend = calcTrend(revenue, sum(previous, "revenue"));
  const hasRevenue = revenue > 0;

  const tiles = [
    {
      label: t(range === 7 ? "revenue_ui.revenue_7" : "revenue_ui.revenue_30"),
      value: formatMNT(revenue),
      foot:
        trend.direction === "flat"
          ? t("revenue_ui.same_as_before")
          : `${trend.direction === "up" ? "▲" : "▼"} ${trend.value}% ${t("vs_last_period")}`,
      footTone: trend.direction === "up" ? "text-[#44523a]" : trend.direction === "down" ? "text-terracotta" : "text-taupe",
    },
    { label: t("revenue_ui.orders"), value: String(orders), foot: t("revenue_ui.paid_only"), footTone: "text-taupe" },
    { label: t("revenue_ui.avg_order"), value: formatMNT(avg), foot: t("revenue_ui.per_order"), footTone: "text-taupe" },
    {
      label: t("total_revenue"),
      value: formatMNT(stats?.totalRevenue),
      foot: `${t("this_month")}: ${formatMNT(stats?.monthlyRevenue)}`,
      footTone: "text-taupe",
    },
  ];

  return (
    <div className="w-full">
      <div className="mb-[24px] flex flex-wrap items-end justify-between gap-[16px]">
        <div>
          <h1 className="store-heading text-[36px] md:text-[44px]">{t("sidebar.revenue")}</h1>
          <p className="mt-[6px] text-[13px] text-taupe">{t("revenue_ui.page_hint")}</p>
        </div>
        <div className="flex items-center gap-[8px]">
          <div className="flex border border-ink/20 p-[3px]" role="group" aria-label={t("revenue_ui.range")}>
            {([7, 30] as Range[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                aria-pressed={range === r}
                className={`h-[34px] px-[14px] text-[13px] transition-colors ${range === r ? "bg-ink text-paper" : "text-ink/70 hover:text-ink"}`}
              >
                {t(r === 7 ? "revenue_ui.days_7" : "revenue_ui.days_30")}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            aria-label={t("refresh")}
            title={t("refresh")}
            className="flex h-[42px] w-[42px] items-center justify-center border border-ink/20 text-ink hover:border-ink disabled:opacity-40"
          >
            <RefreshCcw className={`h-[16px] w-[16px] ${loading ? "animate-spin" : ""}`} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {failed && (
        <div role="alert" className="mb-[16px] border border-terracotta/30 bg-terracotta/5 p-[12px] text-[13px] text-terracotta">
          {t("revenue_ui.load_failed")}
        </div>
      )}

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-[1px] border border-ink/10 bg-ink/10 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="bg-white px-[18px] py-[18px] md:px-[22px] md:py-[20px]">
            <p className="text-[12px] text-taupe">{tile.label}</p>
            {loading ? (
              <Skeleton className="mt-[10px] h-[30px] w-2/3 rounded-none" />
            ) : (
              <p className="mt-[6px] break-words text-[clamp(1rem,4.5vw,1.375rem)] font-medium tabular-nums text-ink md:text-[26px]">{failed && !stats ? "—" : tile.value}</p>
            )}
            <p className={`mt-[4px] text-[12px] ${tile.footTone}`}>{loading || (failed && !stats) ? " " : tile.foot}</p>
          </div>
        ))}
      </div>

      {/* Daily revenue */}
      <section className="mt-[24px] border border-ink/10 bg-white px-[16px] py-[20px] md:px-[24px]">
        <h2 className="text-[14px] font-medium text-ink">
          {t(range === 7 ? "revenue_ui.daily_7" : "revenue_ui.daily_30")}
        </h2>
        <div className="mt-[16px] h-[260px]">
          {loading ? (
            <Skeleton className="h-full w-full rounded-none" />
          ) : failed && !stats ? <p className="flex h-full items-center justify-center text-sm text-taupe">{t("revenue_ui.load_failed")}</p> : hasRevenue ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={current} margin={{ top: 8, right: 0, bottom: 0, left: 0 }} barCategoryGap={range === 7 ? "28%" : "18%"}>
                <CartesianGrid vertical={false} stroke="rgba(28,23,20,0.08)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatShortDate}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(28,23,20,0.2)" }}
                  tick={{ fontSize: 11, fill: "#6f655d" }}
                  interval={range === 7 ? 0 : "preserveStartEnd"}
                  minTickGap={12}
                />
                <YAxis
                  tickFormatter={formatMNTCompact}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "#6f655d" }}
                  width={52}
                />
                <Tooltip cursor={{ fill: "rgba(239,231,221,0.7)" }} content={<ChartTooltip t={t} />} />
                <Bar dataKey="revenue" fill="#1c1714" radius={0} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-[4px] px-[16px] text-center text-[13px] text-taupe">
              <p className="text-ink">{t("revenue_ui.no_revenue_range")}</p>
              <p>{t("revenue_ui.no_revenue_hint")}</p>
            </div>
          )}
        </div>
      </section>

      {/* Recent paid orders */}
      <section className="mt-[24px] border border-ink/10 bg-white">
        <h2 className="border-b border-ink/10 px-[16px] py-[14px] text-[14px] font-medium text-ink md:px-[24px]">
          {t("recent_payments")}
        </h2>
        {loading ? (
          <div className="space-y-[8px] p-[16px]">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-[40px] w-full rounded-none" />
            ))}
          </div>
        ) : failed && !stats ? <p className="p-6 text-center text-sm text-taupe">{t("revenue_ui.load_failed")}</p> : payments.length ? (
          <ul className="divide-y divide-ink/10">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-[12px] px-[16px] py-[12px] md:px-[24px]">
                <div className="min-w-0">
                  <p className="font-mono text-[13px] text-ink">#{p.orderId}</p>
                  <p className="text-[12px] tabular-nums text-taupe">{formatDateTime(p.createdAt)}</p>
                </div>
                <div className="flex items-center gap-[12px]">
                  <span className="hidden sm:block">
                    <StatusBadge status={p.status as OrderStatus} t={t} />
                  </span>
                  <span className="w-[100px] text-right text-[14px] font-medium tabular-nums text-ink">{formatMNT(p.amount)}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-[24px] py-[32px] text-center text-[13px] text-taupe">
            <p className="text-ink">{t("no_payments")}</p>
            <p className="mt-[4px]">{t("revenue_ui.no_payments_hint")}</p>
          </div>
        )}
      </section>
    </div>
  );
}
