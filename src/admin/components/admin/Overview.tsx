"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, RefreshCcw } from "lucide-react";
import { API_BASE_URL } from "@admin/lib/api";
import { useAuth } from "@admin/provider/AuthProvider";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { AdminView } from "@admin/components/Sidebar";
import { Skeleton } from "@admin/components/ui/skeleton";
import { formatDateTime, formatMNT, ubDayKey } from "@admin/utils/format";
import { ProductType } from "@admin/type/type";
import {
  OrderStatus,
  RawOrder,
} from "@/app/(admin)/admin/[locale]/(orders)/components/type";
import { StatusBadge } from "@/app/(admin)/admin/[locale]/(orders)/components/OrderDetails";

type Orders = {
  counts: Partial<Record<OrderStatus, number>>;
  orders: RawOrder[];
};
type Revenue = {
  chartData: { date: string; revenue: number; orders: number }[];
};

export default function Overview({
  onNavigate,
}: {
  onNavigate: (view: AdminView) => void;
}) {
  const { t, locale } = useI18n();
  const { token } = useAuth();
  const [orders, setOrders] = useState<Orders | null>(null);
  const [revenue, setRevenue] = useState<Revenue | null>(null);
  const [inventory, setInventory] = useState<ProductType[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    const read = async (path: string) => {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(String(response.status));
      return response.json();
    };
    setLoading(true);
    setFailed(false);
    void Promise.allSettled([
      read("/order?limit=6"),
      read("/order?mode=revenue"),
      read("/products/admin/inventory"),
    ]).then((results) => {
      if (controller.signal.aborted) return;
      const [orderResult, revenueResult, inventoryResult] = results;
      setOrders(orderResult.status === "fulfilled" ? orderResult.value : null);
      setRevenue(
        revenueResult.status === "fulfilled" ? revenueResult.value : null,
      );
      setInventory(
        inventoryResult.status === "fulfilled" &&
          Array.isArray(inventoryResult.value)
          ? inventoryResult.value
          : null,
      );
      setFailed(results.some((result) => result.status === "rejected"));
      setLoading(false);
    });
    return () => controller.abort();
  }, [token, reload]);

  const refresh = useCallback(() => setReload((value) => value + 1), []);
  const recentRevenue = useMemo(() => {
    const from = ubDayKey(new Date(Date.now() - 29 * 86_400_000));
    const through = ubDayKey(new Date());
    return (revenue?.chartData ?? []).filter(
      (day) => day.date >= from && day.date <= through,
    );
  }, [revenue]);
  const paidTotal = recentRevenue.reduce(
    (total, day) => total + day.revenue,
    0,
  );
  const paidOrders = recentRevenue.reduce(
    (total, day) => total + day.orders,
    0,
  );
  const count = (...statuses: OrderStatus[]) =>
    orders
      ? String(
          statuses.reduce(
            (total, status) => total + (orders.counts[status] ?? 0),
            0,
          ),
        )
      : "—";
  const lowStock =
    inventory?.filter(
      (product) =>
        product.stockLevel === "low" || product.stockLevel === "soldout",
    ) ?? [];
  const tiles = [
    {
      label: "overview.attention",
      value: count("PENDING", "WAITING_PAYMENT", "COD_PENDING", "PAID"),
      note: "overview.all_time",
      view: "orders",
    },
    {
      label: "overview.awaiting_payment",
      value: count("PENDING", "WAITING_PAYMENT"),
      note: "overview.all_time",
      view: "orders",
    },
    {
      label: "overview.to_fulfill",
      value: count("PAID", "COD_PENDING"),
      note: "overview.all_time",
      view: "orders",
    },
    {
      label: "overview.completed",
      value: count("DELIVERED"),
      note: "overview.all_time",
      view: "orders",
    },
  ] as const;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[12px] font-medium text-taupe">
            LORENTZ / {t("overview.workspace")}
          </p>
          <h1>{t("overview.title")}</h1>
          <p className="mt-2 text-sm text-taupe">{t("overview.description")}</p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="btn-secondary !px-4"
        >
          <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {t("refresh")}
        </button>
      </header>

      {failed && (
        <div
          role="alert"
          className="border border-terracotta/30 bg-white p-4 text-sm text-terracotta"
        >
          {t("overview.load_failed")}
        </div>
      )}

      <section
        aria-label={t("overview.operations")}
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {tiles.map((tile) => (
          <button
            key={tile.label}
            type="button"
            onClick={() => onNavigate(tile.view)}
            className="admin-surface p-5 text-left transition-colors hover:border-ink/40"
          >
            <p className="text-sm text-taupe">{t(tile.label)}</p>
            {loading ? (
              <Skeleton className="my-3 h-9 w-20" />
            ) : (
              <p className="my-2 text-[32px] font-medium tabular-nums leading-tight">
                {tile.value}
              </p>
            )}
            <span className="flex items-center justify-between text-xs text-taupe">
              {t(tile.note)}
              <ArrowRight className="h-4 w-4" />
            </span>
          </button>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)]">
        <section className="admin-surface min-w-0">
          <div className="flex items-center justify-between gap-3 border-b border-ink/10 p-5">
            <h2 className="text-base font-semibold">
              {t("overview.recent_orders")}
            </h2>
            <button
              type="button"
              onClick={() => onNavigate("orders")}
              className="inline-flex min-h-10 items-center gap-2 text-sm underline-offset-4 hover:underline"
            >
              {t("overview.view_all")}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          {loading ? (
            <div className="space-y-3 p-5">
              {[0, 1, 2, 3].map((value) => (
                <Skeleton key={value} className="h-14 w-full" />
              ))}
            </div>
          ) : !orders ? (
            <p className="p-8 text-sm text-taupe">{t("fetch_failed")}</p>
          ) : orders.orders.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="text-base font-medium">{t("orders_empty")}</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-taupe">
                {t("overview.orders_hint")}
              </p>
              <button
                type="button"
                onClick={() => onNavigate("products")}
                className="btn-secondary mt-5"
              >
                {t("sidebar.product_catalog")}
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-ink/10">
              {orders.orders.map((order) => (
                <li key={order.id}>
                  <button
                    type="button"
                    onClick={() => onNavigate("orders")}
                    className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left hover:bg-paper"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        #{order.orderNumber ?? order.id.slice(0, 8)}
                      </p>
                      <p className="mt-1 text-xs text-taupe">
                        {[order.lastName, order.firstName]
                          .filter(Boolean)
                          .join(" ") ||
                          order.user?.email ||
                          "—"}{" "}
                        · {formatDateTime(order.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={order.status ?? "PENDING"} t={t} />
                      <span className="text-sm font-medium tabular-nums">
                        {formatMNT(order.totalPrice)}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          <section className="admin-surface p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-base font-semibold">
                {t("overview.revenue")}
              </h2>
              <span className="text-xs text-taupe">
                {t("revenue_ui.days_30")}
              </span>
            </div>
            {loading ? (
              <Skeleton className="my-4 h-10 w-40" />
            ) : (
              <p className="my-4 text-[30px] font-medium tabular-nums">
                {revenue ? formatMNT(paidTotal) : "—"}
              </p>
            )}
            <dl className="space-y-3 border-y border-ink/10 py-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-taupe">{t("revenue_ui.orders")}</dt>
                <dd className="tabular-nums">{revenue ? paidOrders : "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-taupe">{t("revenue_ui.avg_order")}</dt>
                <dd className="tabular-nums">
                  {revenue
                    ? formatMNT(paidOrders ? paidTotal / paidOrders : 0)
                    : "—"}
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-xs leading-relaxed text-taupe">
              {t("overview.revenue_rule")}
            </p>
            <button
              type="button"
              onClick={() => onNavigate("revenue")}
              className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-medium"
            >
              {t("overview.view_analytics")}
              <ArrowRight className="h-4 w-4" />
            </button>
          </section>

          <section className="admin-surface p-5">
            <h2 className="text-base font-semibold">
              {t("overview.inventory")}
            </h2>
            {loading ? (
              <Skeleton className="mt-4 h-20 w-full" />
            ) : !inventory ? (
              <p className="mt-3 text-sm text-taupe">{t("fetch_failed")}</p>
            ) : (
              <>
                <p className="mt-2 text-sm text-taupe">
                  {t("editor.page_hint", { count: inventory.length })}
                </p>
                {lowStock.length ? (
                  <ul className="mt-4 divide-y divide-ink/10">
                    {lowStock.slice(0, 5).map((product) => (
                      <li
                        key={String(product.id)}
                        className="flex items-start justify-between gap-3 py-3 text-sm"
                      >
                        <span className="min-w-0 break-words">
                          {product.productName}
                        </span>
                        <span className="shrink-0 text-xs text-terracotta">
                          {t(
                            product.stockLevel === "soldout"
                              ? "overview.soldout"
                              : "overview.low_stock",
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 border-t border-ink/10 pt-4 text-sm text-taupe">
                    {t("overview.no_stock_alerts")}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => onNavigate("products")}
                  className="mt-3 inline-flex min-h-10 items-center gap-2 text-sm font-medium"
                >
                  {t("sidebar.product_catalog")}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </>
            )}
          </section>
        </div>
      </div>
      <p className="text-xs text-taupe">
        {t("overview.timezone")} ·{" "}
        {new Intl.DateTimeFormat(locale === "mn" ? "mn-MN" : "en-GB", {
          timeZone: "Asia/Ulaanbaatar",
          dateStyle: "medium",
        }).format(new Date())}
      </p>
    </div>
  );
}
