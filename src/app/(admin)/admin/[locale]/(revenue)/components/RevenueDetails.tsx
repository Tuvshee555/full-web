"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@admin/components/ui/card";
import { PaymentLike } from "../RevenueDashboard";

/* local copy of STATUS_BADGE to match your project colors */
const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-sand text-taupe border-transparent",
  WAITING_PAYMENT: "bg-terracotta/10 text-terracotta border-transparent",
  COD_PENDING: "bg-sand text-taupe border-transparent",
  PAID: "bg-ink text-paper border-transparent",
  DELIVERING: "bg-ink/10 text-ink border-transparent",
  DELIVERED: "bg-[#5b6b4b]/15 text-[#44523a] border-transparent",
  CANCELLED: "bg-ink/5 text-ink/45 border-transparent",
};

type Props = {
  t: (key: string) => string;
  chartData: { date: string; revenue: number }[];
  payments: PaymentLike[];
  loading: boolean;
};

export function RevenueDetails({ t, chartData, payments, loading }: Props) {
  const hasRevenue = chartData.some((d) => d.revenue > 0);

  return (
    <div className="space-y-6">
      {/* Chart card */}
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="text-sm">{t("last_7_days")}</CardTitle>
        </CardHeader>

        <CardContent className="h-[260px]">
          {loading ? (
            <div className="h-full animate-pulse bg-muted rounded" />
          ) : hasRevenue ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--foreground))"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              {t("no_payments")}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payments list */}
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="text-sm">{t("recent_payments")}</CardTitle>
        </CardHeader>

        <CardContent className="divide-y divide-border">
          {loading ? (
            <div className="h-24 animate-pulse bg-muted rounded" />
          ) : payments.length ? (
            payments.map((p) => (
              <div
                key={p.id}
                className="py-3 flex items-center justify-between text-sm"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{p.orderId}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(p.createdAt).toLocaleString()}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-medium">
                    ₮{p.amount.toLocaleString()}
                  </div>
                  <div
                    className={`text-xs px-2 py-0.5 rounded-full border font-medium mt-1 ${
                      STATUS_BADGE[p.status] ?? ""
                    }`}
                  >
                    {t(`order_status.${p.status}`)}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {t("no_payments")}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
