/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ClipboardList, Copy, Printer, RefreshCw, SearchX } from "lucide-react";
import { printPackingSlips } from "@admin/lib/packingSlips";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { useAuth } from "@admin/provider/AuthProvider";
import { useAdminNav } from "@admin/lib/adminNav";
import { api } from "@admin/lib/api";
import { AdminTabs } from "@admin/components/ui/AdminTabs";
import { PageHeader } from "@admin/components/ui/page";
import { BulkBar, Checkbox, Pagination, SearchInput, bulkButton } from "@admin/components/ui/controls";
import { EmptyState, ErrorState, LoadingRows } from "@admin/components/ui/feedback";
import { ConfirmDialog } from "@admin/components/ui/confirm-dialog";
import { normalizeOrderId } from "@admin/utils/normalizeOrderId";
import { formatMNT, formatWhen } from "@admin/utils/format";
import { normalizeDelivery } from "@admin/utils/normalizeDelivery";
import { cn } from "@admin/lib/utils";
import { ORDERS_PAGE_SIZE, useOrdersAdmin } from "./components/hooks/useOrdersAdmin";
import { NextStepButton, OrderDrawer, OrderStatusPill, PaymentPill, courierText, customerName } from "./components/OrderDetails";
import { ORDER_TABS, OrderStatus, PLACEHOLDER, RawOrder, nextStepKey, orderNumber, primaryNext } from "./components/type";

function ItemThumbs({ order, t }: { order: RawOrder; t: (k: string, p?: Record<string, string | number>) => string }) {
  const items = order.orderItems ?? order.items ?? [];
  const qty = items.reduce((s, it) => s + it.quantity, 0);
  return (
    <div className="flex items-center gap-[8px]">
      <div className="flex -space-x-[8px]">
        {items.slice(0, 3).map((it, i) => (
          <img
            key={i}
            src={it.product?.image || PLACEHOLDER}
            alt=""
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = PLACEHOLDER; }}
            className="h-[32px] w-[32px] border-2 border-white bg-sand object-cover"
          />
        ))}
      </div>
      <span className="text-[13px] tabular-nums text-taupe">{t("orders.items_count", { count: qty })}</span>
    </div>
  );
}

/** What to do with an order now: its button, or one short line when there is nothing to press. */
function NextCell({ order, t, busy, onChange }: { order: RawOrder; t: (k: string, p?: Record<string, string | number>) => string; busy: boolean; onChange: (next: OrderStatus) => void }) {
  const next = primaryNext((order.status ?? "PENDING") as OrderStatus, order.paymentMethod);
  if (next) return <NextStepButton order={order} t={t} busy={busy} onChange={onChange} />;
  return <span className="text-[13px] leading-snug text-taupe">{t(`orders.next_short.${nextStepKey(order)}`)}</span>;
}

const BULK_STEPS: { next: OrderStatus; from: OrderStatus[] }[] = [
  { next: "DELIVERING", from: ["PAID", "COD_PENDING"] },
  { next: "DELIVERED", from: ["DELIVERING"] },
];

export default function OrdersAdmin() {
  const { t } = useI18n();
  const { token } = useAuth();
  const { setParams, refreshSummary } = useAdminNav();
  const searchParams = useSearchParams();
  const tab = ORDER_TABS.some((x) => x.id === searchParams?.get("tab")) ? searchParams!.get("tab")! : "all";
  const openId = searchParams?.get("order") ?? null;

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState<OrderStatus | null>(null);
  const [detail, setDetail] = useState<RawOrder | null>(null);
  const [detailError, setDetailError] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const pushedDrawer = useRef(false);

  const statuses = useMemo(() => ORDER_TABS.find((x) => x.id === tab)?.statuses ?? [], [tab]);
  const { orders, counts, page, loading, refreshing, fetchError, totalOrders, busyId, bulkBusy, setPage, copy, changeStatus, changeMany, reload } =
    useOrdersAdmin({ token, t, search, statuses, onChanged: refreshSummary });
  const when = (iso?: string) => formatWhen(iso, { today: t("common.today"), yesterday: t("common.yesterday") });

  // Debounce the search box so we don't hit the API on every keystroke
  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(normalizeOrderId(searchInput));
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [searchInput, setPage]);

  // A new page of results starts with nothing selected
  useEffect(() => setSelected(new Set()), [page, tab, search]);

  const tabCount = (statusesOfTab: OrderStatus[]) =>
    (statusesOfTab.length ? statusesOfTab : (Object.keys(counts) as OrderStatus[])).reduce((s, st) => s + (counts[st] ?? 0), 0);

  const selectTab = (id: string) => {
    setParams({ tab: id === "all" ? null : id, order: null });
    setPage(1);
  };

  // ----- Order drawer: the address holds the open order, so links (Telegram, overview) open it directly -----
  const listed = openId ? orders.find((o) => o.id === openId) ?? null : null;
  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setDetailError(false);
    try {
      const { data } = await api.get(`/order/${id}`);
      setDetail(data);
    } catch {
      setDetailError(true);
    } finally {
      setDetailLoading(false);
    }
  }, []);
  useEffect(() => {
    if (!openId) { setDetail(null); return; }
    if (!listed && !loading && detail?.id !== openId) void loadDetail(openId);
  }, [openId, listed, loading, detail?.id, loadDetail]);
  const drawerOrder = listed ?? (detail?.id === openId ? detail : null);

  const openOrder = (id: string) => {
    // Only the first open adds a history entry, so Back (or Close) always returns to the list.
    if (openId) {
      setParams({ order: id });
      return;
    }
    pushedDrawer.current = true;
    setParams({ order: id }, "push");
  };
  const closeOrder = () => {
    if (pushedDrawer.current) {
      pushedDrawer.current = false;
      window.history.back();
    } else {
      setParams({ order: null });
    }
  };
  useEffect(() => {
    const onPop = () => { pushedDrawer.current = false; };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const change = async (order: RawOrder, next: OrderStatus) => {
    const ok = await changeStatus(order, next);
    if (ok && openId === order.id && !listed) void loadDetail(order.id);
  };

  // ----- Selection and bulk actions -----
  const selectedOrders = orders.filter((o) => selected.has(o.id));
  const allSelected = orders.length > 0 && selectedOrders.length === orders.length;
  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id); else next.delete(id);
      return next;
    });
  const eligible = (next: OrderStatus) => selectedOrders.filter((o) => BULK_STEPS.find((s) => s.next === next)!.from.includes((o.status ?? "PENDING") as OrderStatus));
  const runBulk = async () => {
    if (!bulkConfirm) return;
    const list = eligible(bulkConfirm);
    setBulkConfirm(null);
    const ok = await changeMany(list, bulkConfirm);
    if (ok) setSelected(new Set());
  };

  const busy = busyId !== null || bulkBusy;
  const emptyKey = search ? "search" : tab;

  return (
    <div className="w-full">
      <PageHeader
        title={t("orders.title")}
        description={t("orders.description")}
        actions={
          <button type="button" onClick={reload} disabled={loading || refreshing} className="btn-secondary">
            <RefreshCw aria-hidden className={cn("h-[15px] w-[15px]", refreshing && "animate-spin")} />
            {t("common.refresh")}
          </button>
        }
      />

      <AdminTabs
        label={t("orders.tabs_label")}
        value={tab}
        onChange={selectTab}
        tabs={ORDER_TABS.map((x) => ({ id: x.id, label: t(`orders.tabs.${x.id}`), count: tabCount(x.statuses), urgent: x.id === "to_ship" }))}
      />

      <div className="mb-[12px] flex flex-wrap items-center gap-[12px]">
        <SearchInput value={searchInput} onChange={setSearchInput} placeholder={t("orders.search")} className="w-full sm:max-w-[420px]" />
        {!loading && !fetchError && (
          <p className="text-[13px] text-taupe" aria-live="polite">
            {search ? t("orders.found", { count: totalOrders }) : t("orders.total", { count: totalOrders })}
          </p>
        )}
      </div>

      {fetchError && <ErrorState className="mb-[12px]" message={fetchError} onRetry={reload} retrying={loading || refreshing} />}

      {loading ? (
        <div className="admin-surface"><LoadingRows rows={6} rowClassName="h-[60px]" /></div>
      ) : orders.length === 0 ? (
        !fetchError && (
          <div className="admin-surface">
            <EmptyState
              icon={search ? SearchX : ClipboardList}
              title={t(`orders.empty.${emptyKey}.title`)}
              description={t(`orders.empty.${emptyKey}.body`)}
              action={search ? <button type="button" className="btn-secondary" onClick={() => setSearchInput("")}>{t("common.clear_search")}</button> : tab !== "all" ? <button type="button" className="btn-secondary" onClick={() => selectTab("all")}>{t("orders.show_all")}</button> : undefined}
            />
          </div>
        )
      ) : (
        <div className={cn("admin-surface transition-opacity", refreshing && "opacity-70")}>
          {/* Laptop and desktop: a table */}
          <table className="hidden w-full text-[14px] lg:table">
            <caption className="sr-only">{t(`orders.tabs.${tab}`)}</caption>
            <thead className="border-b border-ink/10">
              <tr>
                <th scope="col" className="w-[44px] pl-[4px]">
                  <Checkbox checked={allSelected} indeterminate={!allSelected && selectedOrders.length > 0} onChange={(on) => setSelected(on ? new Set(orders.map((o) => o.id)) : new Set())} label={t("bulk.select_page")} />
                </th>
                <th scope="col" className="admin-th">{t("orders.col.order")}</th>
                <th scope="col" className="admin-th">{t("orders.col.customer")}</th>
                <th scope="col" className="admin-th hidden xl:table-cell">{t("orders.col.items")}</th>
                <th scope="col" className="admin-th text-right">{t("orders.col.total")}</th>
                <th scope="col" className="admin-th">{t("orders.col.status")}</th>
                <th scope="col" className="admin-th">{t("orders.col.next")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {orders.map((o) => {
                const d = normalizeDelivery(o);
                const isSelected = selected.has(o.id);
                return (
                  <tr key={o.id} onClick={() => openOrder(o.id)} className={cn("cursor-pointer transition-colors hover:bg-paper", isSelected && "bg-sand/50", openId === o.id && "bg-paper")}>
                    <td className="w-[44px] pl-[4px]" onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={isSelected} onChange={(on) => toggle(o.id, on)} label={t("bulk.select_order", { order: orderNumber(o) })} />
                    </td>
                    <td className="admin-td">
                      <button type="button" onClick={(e) => { e.stopPropagation(); openOrder(o.id); }} className="text-left font-medium text-ink underline-offset-4 hover:underline">
                        #{orderNumber(o)}
                        <span className="sr-only"> — {t("orders.open_details")}</span>
                      </button>
                      <p className="text-[12px] tabular-nums text-taupe">{when(o.createdAt)}</p>
                    </td>
                    <td className="admin-td max-w-[240px]">
                      <p className="truncate text-ink">{customerName(o, t)}</p>
                      {d?.phone && <p className="text-[12px] tabular-nums text-taupe">{d.phone}</p>}
                    </td>
                    <td className="admin-td hidden xl:table-cell"><ItemThumbs order={o} t={t} /></td>
                    <td className="admin-td text-right font-medium tabular-nums">{formatMNT(o.totalPrice)}</td>
                    <td className="admin-td">
                      <div className="flex flex-col items-start gap-[4px]">
                        <OrderStatusPill order={o} t={t} />
                        <PaymentPill order={o} t={t} />
                      </div>
                    </td>
                    <td className="admin-td w-[190px]" onClick={(e) => e.stopPropagation()}>
                      <NextCell order={o} t={t} busy={busy} onChange={(next) => void change(o, next)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Phones and tablets: one card per order */}
          <ul className="divide-y divide-ink/10 lg:hidden">
            {orders.map((o) => {
              const isSelected = selected.has(o.id);
              return (
                <li key={o.id} className={cn("relative flex gap-[4px] py-[12px] pl-[2px] pr-[14px]", isSelected && "bg-sand/50")}>
                  <Checkbox checked={isSelected} onChange={(on) => toggle(o.id, on)} label={t("bulk.select_order", { order: orderNumber(o) })} className="-mt-[8px]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-[12px]">
                      <button type="button" onClick={() => openOrder(o.id)} className="min-w-0 text-left after:absolute after:inset-0 after:content-['']">
                        <span className="block font-medium text-ink">#{orderNumber(o)}</span>
                        <span className="block truncate text-[14px] text-ink">{customerName(o, t)}</span>
                        <span className="block text-[12px] tabular-nums text-taupe">{when(o.createdAt)}</span>
                      </button>
                      <span className="shrink-0 text-[15px] font-semibold tabular-nums text-ink">{formatMNT(o.totalPrice)}</span>
                    </div>
                    <div className="mt-[8px] flex flex-wrap items-center gap-[6px]">
                      <OrderStatusPill order={o} t={t} />
                      <PaymentPill order={o} t={t} />
                    </div>
                    <div className="relative z-[2] mt-[10px] [&_.btn]:w-full" onClick={(e) => e.stopPropagation()}>
                      <NextCell order={o} t={t} busy={busy} onChange={(next) => void change(o, next)} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <Pagination page={page} pageSize={ORDERS_PAGE_SIZE} total={totalOrders} onPage={(p) => { setPage(p); window.scrollTo({ top: 0 }); }} disabled={loading || refreshing} />
        </div>
      )}

      <BulkBar count={selectedOrders.length} onClear={() => setSelected(new Set())}>
        {BULK_STEPS.map(({ next }) => {
          const n = eligible(next).length;
          return n ? (
            <button key={next} type="button" className={bulkButton} disabled={busy} onClick={() => setBulkConfirm(next)}>
              {t(`orders.bulk.${next}`, { count: n })}
            </button>
          ) : null;
        })}
        <button
          type="button"
          className={bulkButton}
          onClick={() => copy(selectedOrders.map((o) => courierText(o, t)).join("\n\n"), t("orders.bulk.courier_copied", { count: selectedOrders.length }))}
        >
          <Copy aria-hidden className="h-[14px] w-[14px]" />
          {t("orders.bulk.copy_courier")}
        </button>
        <button type="button" className={bulkButton} onClick={() => printPackingSlips(selectedOrders, t)}>
          <Printer aria-hidden className="h-[14px] w-[14px]" />
          {t("orders.print.bulk", { count: selectedOrders.length })}
        </button>
      </BulkBar>

      <ConfirmDialog
        open={bulkConfirm !== null}
        onOpenChange={(open) => !open && setBulkConfirm(null)}
        title={bulkConfirm ? t(`orders.bulk_confirm.${bulkConfirm}.title`, { count: eligible(bulkConfirm).length }) : ""}
        description={bulkConfirm ? t(`orders.bulk_confirm.${bulkConfirm}.body`, { orders: eligible(bulkConfirm).map((o) => `#${orderNumber(o)}`).join(", ") }) : ""}
        confirmLabel={bulkConfirm ? t(`orders.bulk.${bulkConfirm}`, { count: eligible(bulkConfirm).length }) : ""}
        busy={bulkBusy}
        onConfirm={() => void runBulk()}
      />

      <OrderDrawer
        open={Boolean(openId)}
        onClose={closeOrder}
        order={drawerOrder}
        loading={detailLoading}
        error={detailError}
        onRetry={() => openId && void loadDetail(openId)}
        t={t}
        busy={busy}
        copy={copy}
        onChange={(order, next) => void change(order, next)}
      />
    </div>
  );
}
