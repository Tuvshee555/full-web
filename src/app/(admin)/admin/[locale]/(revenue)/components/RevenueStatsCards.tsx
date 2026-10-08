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
    <Card className="border border-border hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className={`rounded-lg p-2 ${iconBg}`}>{icon}</div>
          {showTrend && trend && (
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                trend.direction === "up"
                  ? "bg-emerald-50 text-emerald-700"
                  : trend.direction === "down"
                  ? "bg-rose-50 text-rose-700"
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
          <p className="mt-1 text-3xl font-bold tracking-tight">{value}</p>
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
        icon={<DollarSign className="w-5 h-5 text-primary" />}
        iconBg="bg-primary/10"
        trend={trend}
        showTrend={true}
      />
      <StatCard
        label={t("this_month")}
        value={month}
        icon={<Calendar className="w-5 h-5 text-violet-600" />}
        iconBg="bg-violet-50"
      />
      <StatCard
        label={t("this_week")}
        value={week}
        icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
        iconBg="bg-emerald-50"
      />

      {trend && (
        <div className="md:col-span-3 flex items-center justify-end text-xs text-muted-foreground">
          {trend.direction === "up" ? (
            <span className="text-emerald-600 font-medium">
              ▲ {trend.value}% {t("vs_last_period")}
            </span>
          ) : trend.direction === "down" ? (
            <span className="text-rose-600 font-medium">
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
