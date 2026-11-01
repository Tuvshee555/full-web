/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  MessageCircle,
  PackageX,
  PhoneCall,
  RefreshCw,
  Truck,
  TrendingDown,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@admin/lib/api";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { useAdminNav } from "@admin/lib/adminNav";
import { PageHeader, Panel } from "@admin/components/ui/page";
import { StatCard } from "@admin/components/ui/status";
import { EmptyState, ErrorState, LoadingRows } from "@admin/components/ui/feedback";
import { InfoTip } from "@admin/components/ui/controls";
import { formatLongDate, formatMNT, formatWhen, ubDayKey } from "@admin/utils/format";
import { needsRestock, stockSummary } from "@admin/utils/inventory";
import { calcTrend } from "@admin/utils/revenue";
import { cn } from "@admin/lib/utils";
import { ProductType } from "@admin/type/type";
import { RawOrder, orderNumber } from "@/app/(admin)/admin/[locale]/(orders)/components/type";
import { OrderStatusPill, customerName } from "@/app/(admin)/admin/[locale]/(orders)/components/OrderDetails";

type Day = { date: string; revenue: number; orders: number };
type TopProduct = { productId: string; productName: string; image: string | null; quantity: number; revenue: number };
type Revenue = { stats: { totalRevenue: number; weeklyRevenue: number; monthlyRevenue: number }; chartData: Day[]; topProducts?: TopProduct[] };

const days = (data: Day[], count: number, offset = 0) => {
  const byDate = new Map(data.map((d) => [d.date, d]));
  return Array.from({ length: count }, (_, i) => {
    const key = ubDayKey(new Date(Date.now() - (count - 1 - i + offset) * 86_400_000));
    return byDate.get(key) ?? { date: key, revenue: 0, orders: 0 };
  });
};
const total = (list: Day[], key: "revenue" | "orders") => list.reduce((s, d) => s + (Number(d[key]) || 0), 0);

type Todo = { id: string; tone: "danger" | "attention"; icon: LucideIcon; text: string; action: string; onClick: () => void; busy?: boolean };

export default function Overview() {
  const { t, locale } = useI18n();
  const { go, summary, refreshSummary, setBot } = useAdminNav();
  const [recent, setRecent] = useState<RawOrder[] | null>(null);
  const [revenue, setRevenue] = useState<Revenue | null>(null);
  const [inventory, setInventory] = useState<ProductType[] | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reload, setReload] = useState(0);
  const [turningOn, setTurningOn] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    void Promise.allSettled([
      api.get("/order", { params: { limit: 6 }, signal: controller.signal }),
      api.get("/order", { params: { mode: "revenue" }, signal: controller.signal }),
      api.get("/products/admin/inventory", { signal: controller.signal }),
      // Money that arrived for a cancelled order needs a person (newest 100 cancelled orders).
      api.get("/order", { params: { status: "CANCELLED", limit: 100 }, signal: controller.signal }),
    ]).then(([orders, sales, stock, cancelled]) => {
      if (controller.signal.aborted) return;
      setRecent(orders.status === "fulfilled" && Array.isArray(orders.value.data?.orders) ? orders.value.data.orders : null);
      setRevenue(sales.status === "fulfilled" ? sales.value.data : null);
      setInventory(stock.status === "fulfilled" && Array.isArray(stock.value.data) ? stock.value.data : null);
      setReviewCount(cancelled.status === "fulfilled" && Array.isArray(cancelled.value.data?.orders) ? cancelled.value.data.orders.filter((o: RawOrder) => o.paymentStatus === "REVIEW").length : 0);
      setFailed([orders, sales, stock].some((r) => r.status === "rejected"));
      setLoading(false);
    });
    return () => controller.abort();
  }, [reload]);

  const refresh = useCallback(() => {
    setReload((v) => v + 1);
    refreshSummary();
  }, [refreshSummary]);

  const turnOnAssistant = async () => {
    setTurningOn(true);
    try {
      const { data } = await api.patch("/chatbot/admin/settings", { fields: { enabled: true } });
      setBot({ enabled: Boolean(data?.enabled), metaOutbound: Boolean(data?.metaOutbound) });
      toast.success(t("assistant.toast.turned_on"));
    } catch {
      toast.error(t("assistant.toast.switch_failed"));
    } finally {
      setTurningOn(false);
    }
  };

  const stockAlerts = useMemo(
    () => (inventory ?? []).map((p) => ({ product: p, stock: stockSummary(p.sizes) })).filter((x) => needsRestock(x.stock)),
    [inventory]
  );
  const soldOut = stockAlerts.filter((x) => x.stock.state === "soldout").length;
  const running = stockAlerts.length - soldOut;

  const todos: Todo[] = [];
  if (reviewCount) todos.push({ id: "review", tone: "danger", icon: AlertTriangle, text: t("overview.todo.review", { count: reviewCount }), action: t("overview.todo.review_action"), onClick: () => go("orders", { tab: "cancelled" }) });
  if (summary.bankToCheck) todos.push({ id: "bank", tone: "attention", icon: Banknote, text: t("overview.todo.bank", { count: summary.bankToCheck }), action: t("overview.todo.bank_action"), onClick: () => go("orders", { tab: "awaiting_payment" }) });
  if (summary.toConfirm) todos.push({ id: "confirm", tone: "attention", icon: ClipboardCheck, text: t("overview.todo.confirm", { count: summary.toConfirm }), action: t("overview.todo.confirm_action"), onClick: () => go("orders", { tab: "awaiting_payment" }) });
  if (summary.toShip) todos.push({ id: "ship", tone: "attention", icon: Truck, text: t("overview.todo.ship", { count: summary.toShip }), action: t("overview.todo.ship_action"), onClick: () => go("orders", { tab: "to_ship" }) });
  if (summary.chatsNeedingYou) todos.push({ id: "chats", tone: "attention", icon: MessageCircle, text: t("overview.todo.chats", { count: summary.chatsNeedingYou }), action: t("overview.todo.chats_action"), onClick: () => go("messages", { filter: "attention" }) });
  if (summary.newRequests) todos.push({ id: "requests", tone: "attention", icon: PhoneCall, text: t("overview.todo.requests", { count: summary.newRequests }), action: t("overview.todo.requests_action"), onClick: () => go("messages", { tab: "requests" }) });
  if (summary.bot && !summary.bot.enabled) todos.push({ id: "bot", tone: "attention", icon: Bot, text: t("overview.todo.bot_off"), action: t("overview.todo.bot_off_action"), onClick: () => void turnOnAssistant(), busy: turningOn });
  if (soldOut) todos.push({ id: "soldout", tone: "attention", icon: PackageX, text: t("overview.todo.soldout", { count: soldOut }), action: t("overview.todo.stock_action"), onClick: () => go("products", { stock: "soldout" }) });
  if (running) todos.push({ id: "low", tone: "attention", icon: TrendingDown, text: t("overview.todo.low", { count: running }), action: t("overview.todo.stock_action"), onClick: () => go("products", { stock: "restock" }) });

  const chart = revenue?.chartData ?? [];
  const today = days(chart, 1)[0];
  const week = days(chart, 7);
  const lastWeek = days(chart, 7, 7);
  const weekTotal = total(week, "revenue");
  const trend = calcTrend(weekTotal, total(lastWeek, "revenue"));
  const fortnight = days(chart, 14);
  const peak = Math.max(1, ...fortnight.map((d) => d.revenue));
  const ready = summary.ready && !loading;
  const when = (iso?: string) => formatWhen(iso, { today: t("common.today"), yesterday: t("common.yesterday") });

  return (
    <div className="space-y-[20px]">
      <PageHeader
        title={t("overview.title")}
        description={t("overview.subtitle", { date: formatLongDate(new Date(), locale) })}
        actions={
          <button type="button" onClick={refresh} disabled={loading} className="btn-secondary">
            <RefreshCw aria-hidden className={cn("h-[15px] w-[15px]", loading && "animate-spin")} />
            {t("common.refresh")}
          </button>
        }
      />

      {(failed || summary.ordersFailed) && !loading && <ErrorState message={t("overview.load_failed")} onRetry={refresh} />}

      {/* What needs the owner, most urgent first */}
      <Panel title={t("overview.todo.title")} description={t("overview.todo.subtitle")}>
        {!ready ? (
          <LoadingRows rows={3} rowClassName="h-[44px]" />
        ) : todos.length === 0 ? (
          <div className="flex items-center gap-[12px] px-[16px] py-[18px] md:px-[20px]">
            <CheckCircle2 aria-hidden className="h-[22px] w-[22px] shrink-0 text-[#3d4a34]" strokeWidth={1.8} />
            <div>
              <p className="text-[15px] font-medium text-ink">{t("overview.todo.clear_title")}</p>
              <p className="text-[13px] text-taupe">{t("overview.todo.clear_body")}</p>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-ink/10">
            {todos.map(({ id, tone, icon: Icon, text, action, onClick, busy }) => (
              <li key={id} className="flex flex-wrap items-center gap-x-[12px] gap-y-[8px] px-[16px] py-[12px] md:px-[20px]">
                <span className={cn("flex h-[32px] w-[32px] shrink-0 items-center justify-center", tone === "danger" ? "bg-terracotta text-paper" : "bg-terracotta/10 text-terracotta")}>
                  <Icon aria-hidden className="h-[16px] w-[16px]" strokeWidth={1.8} />
                </span>
                <p className="min-w-[180px] flex-1 text-[14px] text-ink">{text}</p>
                <button type="button" onClick={onClick} disabled={busy} className="btn-secondary btn-sm">
                  {action}
                  <ArrowRight aria-hidden className="h-[14px] w-[14px]" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* Money */}
      <section aria-label={t("overview.sales_label")} className="grid grid-cols-2 gap-[12px] lg:grid-cols-4">
        <StatCard
          label={t("overview.stats.today")}
          value={revenue ? formatMNT(today.revenue) : "—"}
          hint={revenue ? t("overview.stats.paid_orders", { count: today.orders }) : undefined}
          loading={loading}
        />
        <StatCard
          label={t("overview.stats.week")}
          value={revenue ? formatMNT(weekTotal) : "—"}
          hint={
            revenue
              ? total(lastWeek, "revenue") === 0
                ? t("overview.stats.no_compare")
                : trend.direction === "flat"
                ? t("overview.stats.same")
                : t(trend.direction === "up" ? "overview.stats.up" : "overview.stats.down", { pct: trend.value })
              : undefined
          }
          hintTone={trend.direction === "up" ? "good" : trend.direction === "down" ? "bad" : "muted"}
          loading={loading}
        />
        <StatCard label={t("overview.stats.month")} value={revenue ? formatMNT(revenue.stats?.monthlyRevenue) : "—"} hint={t("overview.stats.month_hint")} loading={loading} />
        <StatCard
          label={t("overview.stats.delivering")}
          value={summary.ready ? String(summary.counts.DELIVERING ?? 0) : "—"}
          hint={t("overview.stats.delivering_hint")}
          loading={!summary.ready}
          onClick={() => go("orders", { tab: "delivering" })}
          actionLabel={t("overview.stats.delivering_action")}
        />
      </section>

      <div className="grid gap-[20px] xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <Panel
          title={t("overview.recent.title")}
          action={<button type="button" onClick={() => go("orders")} className="btn-ghost btn-sm">{t("overview.recent.all")}<ArrowRight aria-hidden className="h-[14px] w-[14px]" /></button>}
        >
          {loading ? (
            <LoadingRows rows={5} rowClassName="h-[48px]" />
          ) : !recent ? (
            <ErrorState className="m-[16px]" message={t("orders.errors.load_failed")} onRetry={refresh} />
          ) : recent.length === 0 ? (
            <EmptyState title={t("overview.recent.empty_title")} description={t("overview.recent.empty_body")} action={<button type="button" className="btn-secondary" onClick={() => go("products")}>{t("overview.recent.empty_action")}</button>} />
          ) : (
            <ul className="divide-y divide-ink/10">
              {recent.map((order) => (
                <li key={order.id}>
                  <button type="button" onClick={() => go("orders", { order: order.id })} className="flex w-full flex-wrap items-center justify-between gap-x-[12px] gap-y-[6px] px-[16px] py-[12px] text-left transition-colors hover:bg-paper md:px-[20px]">
                    <span className="min-w-0">
                      <span className="block text-[14px] font-medium text-ink">#{orderNumber(order)} · {customerName(order, t)}</span>
                      <span className="block text-[12px] tabular-nums text-taupe">{when(order.createdAt)}</span>
                    </span>
                    <span className="flex items-center gap-[12px]">
                      <OrderStatusPill order={order} t={t} />
                      <span className="w-[92px] text-right text-[14px] font-medium tabular-nums">{formatMNT(order.totalPrice)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-[20px]">
          <Panel
            title={
              <span className="inline-flex items-center gap-[8px]">
                {t("overview.chart.title")}
                <InfoTip text={t("overview.chart.rule")} />
              </span>
            }
            action={<button type="button" onClick={() => go("revenue")} className="btn-ghost btn-sm">{t("overview.chart.open")}<ArrowRight aria-hidden className="h-[14px] w-[14px]" /></button>}
            bodyClassName="px-[16px] py-[16px] md:px-[20px]"
          >
            {loading ? (
              <LoadingRows rows={1} className="p-0" rowClassName="h-[96px]" />
            ) : !revenue ? (
              <p className="text-[13px] text-taupe">{t("revenue.errors.load_failed")}</p>
            ) : (
              <>
                <p className="text-[22px] font-semibold tabular-nums">{formatMNT(total(fortnight, "revenue"))}</p>
                <p className="text-[12px] text-taupe">{t("overview.chart.orders", { count: total(fortnight, "orders") })}</p>
                <ul className="mt-[14px] flex h-[88px] items-end gap-[3px]" aria-label={t("overview.chart.bars_label")}>
                  {fortnight.map((d) => (
                    <li key={d.date} className="flex h-full flex-1 items-end" title={`${d.date.slice(5).replace("-", ".")}: ${formatMNT(d.revenue)}`}>
                      <span className="sr-only">{`${d.date.slice(5).replace("-", ".")}: ${formatMNT(d.revenue)}`}</span>
                      <span className={cn("block w-full", d.revenue ? "bg-ink" : "bg-ink/10")} style={{ height: `${Math.max(4, (d.revenue / peak) * 100)}%` }} />
                    </li>
                  ))}
                </ul>
                <div className="mt-[6px] flex justify-between text-[11px] tabular-nums text-taupe">
                  <span>{fortnight[0].date.slice(5).replace("-", ".")}</span>
                  <span>{t("common.today")}</span>
                </div>
              </>
            )}
          </Panel>

          <Panel title={t("overview.best.title")} description={t("overview.best.subtitle")}>
            {loading ? (
              <LoadingRows rows={3} rowClassName="h-[44px]" />
            ) : !revenue ? (
              <p className="px-[16px] py-[16px] text-[13px] text-taupe md:px-[20px]">{t("revenue.errors.load_failed")}</p>
            ) : !revenue.topProducts?.length ? (
              <p className="px-[16px] py-[16px] text-[13px] leading-relaxed text-taupe md:px-[20px]">{t("overview.best.none")}</p>
            ) : (
              <ol className="divide-y divide-ink/10">
                {revenue.topProducts.map((p, index) => (
                  <li key={p.productId}>
                    <button type="button" onClick={() => go("products", { product: p.productId })} className="flex w-full items-center gap-[12px] px-[16px] py-[10px] text-left hover:bg-paper md:px-[20px]">
                      <span className="w-[16px] shrink-0 text-[13px] tabular-nums text-taupe">{index + 1}</span>
                      {p.image ? <img src={p.image} alt="" className="h-[36px] w-[36px] shrink-0 bg-sand object-cover" /> : <span className="h-[36px] w-[36px] shrink-0 bg-sand" />}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] text-ink">{p.productName}</span>
                        <span className="block text-[12px] tabular-nums text-taupe">{t("overview.best.sold", { count: p.quantity })}</span>
                      </span>
                      <span className="shrink-0 text-[13px] font-medium tabular-nums text-ink">{formatMNT(p.revenue)}</span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          <Panel
            title={t("overview.stock.title")}
            action={<button type="button" onClick={() => go("products")} className="btn-ghost btn-sm">{t("overview.stock.open")}<ArrowRight aria-hidden className="h-[14px] w-[14px]" /></button>}
          >
            {loading ? (
              <LoadingRows rows={3} rowClassName="h-[40px]" />
            ) : !inventory ? (
              <ErrorState className="m-[16px]" message={t("products.errors.load_failed")} onRetry={refresh} />
            ) : stockAlerts.length === 0 ? (
              <p className="px-[16px] py-[16px] text-[13px] leading-relaxed text-taupe md:px-[20px]">{t("overview.stock.none")}</p>
            ) : (
              <ul className="divide-y divide-ink/10">
                {stockAlerts.slice(0, 6).map(({ product, stock }) => (
                  <li key={String(product.id)}>
                    <button type="button" onClick={() => go("products", { product: String(product.id) })} className="flex w-full items-start justify-between gap-[12px] px-[16px] py-[10px] text-left hover:bg-paper md:px-[20px]">
                      <span className="min-w-0">
                        <span className="block text-[14px] text-ink">{product.productName}</span>
                        <span className="block text-[12px] text-taupe">
                          {[
                            ...stock.soldOut.map((label) => t("overview.stock.option_soldout", { option: label })),
                            ...stock.low.map((s) => t("overview.stock.option_low", { option: s.label, count: s.stock })),
                          ].join(" · ")}
                        </span>
                      </span>
                      <span className={cn("shrink-0 text-[12px] font-medium", stock.state === "soldout" ? "text-terracotta" : "text-ink")}>
                        {t(`stock.state.${stock.state}`)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <p className="text-[12px] text-taupe">{t("common.timezone_note")}</p>
    </div>
  );
}
