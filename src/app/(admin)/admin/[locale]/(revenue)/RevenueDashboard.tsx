"use client";

import { API_BASE_URL } from "@admin/lib/api";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { DashboardHeader } from "./components/DashboardHeader";
import { RevenueStatsCards } from "./components/RevenueStatsCards";
import { RevenueDetails } from "./components/RevenueDetails";
import { calcTrend } from "@admin/utils/revenue";

export type RevenueData = {
  totalRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
};

export type PaymentLike = {
  id: string;
  orderId: string;
  amount: number;
  status: string;
  createdAt: string;
};

export default function RevenueDashboard() {
  const { t } = useI18n();

  const [stats, setStats] = useState<RevenueData | null>(null);
  const [payments, setPayments] = useState<PaymentLike[]>([]);
  const [chartData, setChartData] = useState<
    { date: string; revenue: number }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<"7d" | "30d">("7d");
  const [trend, setTrend] = useState<{
    value: number;
    direction: "up" | "down" | "flat";
  } | null>(null);
  const token =
    typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;

  const fetchOrders = async () => {
    setLoading(true);
    try {
      if (!token) {
        setStats(null);
        setPayments([]);
        setChartData([]);
        return;
      }

      const url = new URL(`${API_BASE_URL}/order`);
      url.searchParams.set("mode", "revenue");

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (!res.ok) {
        setStats(null);
        setPayments([]);
        setChartData([]);
        return;
      }

      const data = await res.json();
      const nextStats = data?.stats ?? null;
      const nextPayments: PaymentLike[] = Array.isArray(data?.payments)
        ? data.payments
        : [];
      const nextChartData: { date: string; revenue: number }[] = Array.isArray(
        data?.chartData
      )
        ? data.chartData
        : [];

      setStats(nextStats);
      setPayments(nextPayments);
      setChartData(nextChartData);
    } catch (err) {
      setStats(null);
      setPayments([]);
      setChartData([]);
      setTrend(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const days = range === "7d" ? 7 : 30;
    const lastNDays = chartData.slice(-days);
    const prevNDays = chartData.slice(-days * 2, -days);

    const lastTotal = lastNDays.reduce((s, d) => s + (d.revenue || 0), 0);
    const prevTotal = prevNDays.reduce((s, d) => s + (d.revenue || 0), 0);

    setTrend(calcTrend(lastTotal, prevTotal));
  }, [range, chartData]);

  const filteredChart = useMemo(() => {
    const days = range === "7d" ? 7 : 30;
    return chartData.slice(-days);
  }, [chartData, range]);

  return (
    <div className="w-full max-w-full overflow-x-hidden bg-background text-foreground px-4 py-4 md:p-6 space-y-6">
      <DashboardHeader
        t={t}
        loading={loading}
        onRefresh={fetchOrders}
        range={range}
        setRange={setRange}
      />

      <RevenueStatsCards t={t} stats={stats} loading={loading} trend={trend} />

      <RevenueDetails
        t={t}
        chartData={filteredChart}
        payments={payments}
        loading={loading}
      />
    </div>
  );
}
