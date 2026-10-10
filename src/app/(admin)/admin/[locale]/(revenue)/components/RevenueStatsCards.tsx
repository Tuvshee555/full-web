"use client";

import { DollarSign, Calendar, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@admin/components/ui/card";
import { RevenueData } from "../RevenueDashboard";

type Trend = { value: number; direction: "up" | "down" | "flat" } | null;

type Props = {
  t: (key: string, params?: Record<string, string | number>) => string;
  stats: RevenueData | null;
  loading: boolean;
  trend?: Trend;
};

type StatCardProps = {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  trend?: Trend;
  showTrend?: boolean;
};

function StatCard({ label, value, icon, iconBg, trend, showTrend }: StatCardProps) {
  return (
    <Card className="border border-border bg-card shadow-none">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className={`rounded-none p-2 ${iconBg}`}>{icon}</div>
          {showTrend && trend && (
            <span
              className={`text-xs font-medium px-2 py-0.5 ${
                trend.direction === "up"
                  ? "bg-[#5b6b4b]/15 text-[#44523a]"
                  : trend.direction === "down"
                  ? "bg-terracotta/10 text-terracotta"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {trend.direction === "up" ? "▲" : trend.direction === "down" ? "▼" : ""}
              {" "}{trend.value}%
            </span>
          )}
        </div>
        <div className="mt-3">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="store-heading mt-[6px] text-[40px]">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function RevenueStatsCards({ t, stats, loading, trend }: Props) {
  const dash = loading ? "—" : "-";

  const total = stats ? `₮${stats.totalRevenue.toLocaleString()}` : dash;
  const month = stats ? `₮${stats.monthlyRevenue.toLocaleString()}` : dash;
  const week = stats ? `₮${stats.weeklyRevenue.toLocaleString()}` : dash;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard
        label={t("total_revenue")}
        value={total}
        icon={<DollarSign className="w-5 h-5 text-ink" strokeWidth={1.3} />}
        iconBg="bg-sand"
        trend={trend}
        showTrend={true}
      />
      <StatCard
        label={t("this_month")}
        value={month}
        icon={<Calendar className="w-5 h-5 text-ink" strokeWidth={1.3} />}
        iconBg="bg-sand"
      />
      <StatCard
        label={t("this_week")}
        value={week}
        icon={<TrendingUp className="w-5 h-5 text-ink" strokeWidth={1.3} />}
        iconBg="bg-sand"
      />

      {trend && (
        <div className="md:col-span-3 flex items-center justify-end text-xs text-muted-foreground">
          {trend.direction === "up" ? (
            <span className="font-medium text-[#44523a]">
              ▲ {trend.value}% {t("vs_last_period")}
            </span>
          ) : trend.direction === "down" ? (
            <span className="font-medium text-terracotta">
              ▼ {trend.value}% {t("vs_last_period")}
            </span>
          ) : (
            <span>0% {t("vs_last_period")}</span>
          )}
        </div>
      )}
    </div>
  );
}
