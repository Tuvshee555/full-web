/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, PackageX, Search, X } from "lucide-react";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { useAuth } from "@admin/provider/AuthProvider";
import { Skeleton } from "@admin/components/ui/skeleton";
import { AdminTabs } from "@admin/components/ui/AdminTabs";
import { normalizeOrderId } from "@admin/utils/normalizeOrderId";
import { formatDateTime, formatMNT } from "@admin/utils/format";
import { PaginationControls } from "./components/PaginationControls";
import { useOrdersAdmin } from "./components/hooks/useOrdersAdmin";
import { NextStepButton, OrderDetails, StatusBadge } from "./components/OrderDetails";
import { ORDER_TABS, OrderStatus, PLACEHOLDER, RawOrder } from "./components/type";

const customerName = (o: RawOrder, fallback: string) =>
  [o.lastName, o.firstName].filter(Boolean).join(" ") || o.user?.email || fallback;

function ItemThumbs({ order }: { order: RawOrder }) {
  const items = order.orderItems ?? order.items ?? [];
  const qty = items.reduce((s, it) => s + it.quantity, 0);
  return (
    <div className="flex items-center gap-[8px]">
      <div className="flex -space-x-[10px]">
        {items.slice(0, 3).map((it, i) => (
          <img
            key={i}
            src={it.product?.image || PLACEHOLDER}
            alt=""
            onError={(e) => (e.currentTarget.src = PLACEHOLDER)}
            className="h-[32px] w-[32px] border-2 border-white object-cover"
          />
        ))}
      </div>
      <span className="text-[12px] tabular-nums text-taupe">×{qty}</span>
    </div>
  );
}

export default function OrdersAdmin({ onChanged }: { onChanged?: () => void }) {
  const { t } = useI18n();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const { token } = useAuth();
  const statuses = useMemo(() => ORDER_TABS.find((x) => x.id === tab)?.statuses ?? [], [tab]);

  const { orders, counts, page, loading, fetchError, totalPages, totalOrders, busyId, setPage, copy, changeStatus, reload } =
    useOrdersAdmin(token, t, search, statuses, onChanged);

  // Debounce the search box so we don't hit the API on every keystroke
  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(normalizeOrderId(searchInput));
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [searchInput, setPage]);

  const tabCount = (statusesOfTab: OrderStatus[]) =>
    (statusesOfTab.length ? statusesOfTab : (Object.keys(counts) as OrderStatus[])).reduce(
      (s, st) => s + (counts[st] ?? 0),
      0
    );

  const selectTab = (id: string) => {
    setTab(id);
    setPage(1);
    setOpenId(null);
  };

  const toggle = (id: string) => setOpenId((cur) => (cur === id ? null : id));

  return (
    <div className="w-full">
      <div className="mb-[24px]">
        <h1 className="store-heading text-[36px] md:text-[44px]">{t("orders")}</h1>
        <p className="mt-[6px] text-[13px] text-taupe">{t("orders_ui.page_hint")}</p>
      </div>

      {/* Tabs */}
      <AdminTabs
        value={tab}
        onChange={selectTab}
        tabs={ORDER_TABS.map((x) => ({ id: x.id, label: t(`orders_ui.tab_${x.id}`), count: tabCount(x.statuses), urgent: x.id === "to_ship" }))}
      />

      {/* Search */}
      <div className="relative mb-[16px] md:max-w-[440px]">
        <Search className="pointer-events-none absolute left-[12px] top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-taupe" strokeWidth={1.5} />
        <input
          type="search"
          aria-label={t("orders_ui.search_placeholder")}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={t("orders_ui.search_placeholder")}
          className="h-[44px] w-full border border-ink/20 bg-white pl-[38px] pr-[38px] text-[14px] text-ink outline-none placeholder:text-ink/60 focus:border-ink"
        />
        {searchInput && (
          <button
            type="button"
            onClick={() => setSearchInput("")}
            aria-label={t("clear")}
            className="absolute right-[6px] top-1/2 flex h-[32px] w-[32px] -translate-y-1/2 items-center justify-center text-taupe hover:text-ink"
          >
            <X className="h-[15px] w-[15px]" />
          </button>
        )}
      </div>

      {fetchError && <div role="alert" className="mb-[16px] flex flex-wrap items-center justify-between gap-[12px] border border-terracotta/30 bg-terracotta/5 p-[12px] text-[13px] text-terracotta"><span>{fetchError}</span><button type="button" onClick={reload} className="btn-secondary !px-[14px]">{t("retry")}</button></div>}

      {loading ? (
        <div className="space-y-[1px] border border-ink/10 bg-white">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-[64px] w-full rounded-none" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        !fetchError && (
          <div className="flex flex-col items-center justify-center gap-[10px] border border-ink/10 bg-white py-[64px] text-center">
            <PackageX className="h-[28px] w-[28px] text-taupe" strokeWidth={1.2} />
            <p className="text-[14px] text-taupe">{search ? t("no_orders_found") : t("orders_empty")}</p>
          </div>
        )
      ) : (
        <div className="border border-ink/10 bg-white">
          {/* Desktop header */}
          <div className="hidden grid-cols-[150px_minmax(0,1fr)_130px_120px_150px_minmax(170px,auto)_28px] items-center gap-[16px] border-b border-ink/10 px-[16px] py-[10px] text-[11px] font-medium uppercase tracking-[0.12em] text-taupe 2xl:grid">
            <span>{t("orders_ui.order")}</span>
            <span>{t("orders_ui.customer")}</span>
            <span>{t("orders_ui.items")}</span>
            <span className="text-right">{t("amount")}</span>
            <span>{t("status")}</span>
            <span />
            <span />
          </div>

          <ul className="divide-y divide-ink/10">
            {orders.map((o) => {
              const status = (o.status ?? "PENDING") as OrderStatus;
              const isOpen = openId === o.id;
              const busy = busyId !== null;
              const name = customerName(o, t("no_email"));
              return (
                <li key={o.id} className={isOpen ? "bg-paper" : ""}>
                  {/* Desktop row */}
                  <div
                    className="relative hidden grid-cols-[150px_minmax(0,1fr)_130px_120px_150px_minmax(170px,auto)_28px] items-center gap-[16px] px-[16px] py-[12px] transition-colors hover:bg-paper 2xl:grid"
                  >
                    <button type="button" aria-expanded={isOpen} aria-controls={`order-details-${o.id}`} aria-label={`${t("view_details")}: #${o.orderNumber ?? o.id.slice(0, 8)}`} onClick={() => toggle(o.id)} className="absolute inset-0 z-[1]" />
                    <div>
                      <p className="font-mono text-[13px] font-medium text-ink">#{o.orderNumber ?? o.id.slice(0, 8)}</p>
                      <p className="text-[12px] tabular-nums text-taupe">{formatDateTime(o.createdAt)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[14px] text-ink">{name}</p>
                      {o.phone && <p className="text-[12px] tabular-nums text-taupe">{o.phone}</p>}
                    </div>
                    <ItemThumbs order={o} />
                    <p className="text-right text-[14px] font-medium tabular-nums text-ink">{formatMNT(o.totalPrice)}</p>
                    <div>
                      <StatusBadge status={status} t={t} />
                    </div>
                    <div className="relative z-[2] flex justify-end">
                      <NextStepButton order={o} t={t} busy={busy} onChange={(s) => changeStatus(o.id, s)} />
                    </div>
                    <ChevronDown className={`h-[16px] w-[16px] text-taupe transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </div>

                  {/* Mobile card */}
                  <div
                    className="relative px-[14px] py-[14px] 2xl:hidden"
                  >
                    <button type="button" aria-expanded={isOpen} aria-controls={`order-details-${o.id}`} aria-label={`${t("view_details")}: #${o.orderNumber ?? o.id.slice(0, 8)}`} onClick={() => toggle(o.id)} className="absolute inset-0 z-[1]" />
                    <div className="flex items-start justify-between gap-[12px]">
                      <div className="min-w-0">
                        <p className="font-mono text-[13px] font-medium text-ink">#{o.orderNumber ?? o.id.slice(0, 8)}</p>
                        <p className="mt-[2px] truncate text-[14px] text-ink">{name}</p>
                        <p className="text-[12px] tabular-nums text-taupe">{formatDateTime(o.createdAt)}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-[6px]">
                        <span className="text-[15px] font-medium tabular-nums text-ink">{formatMNT(o.totalPrice)}</span>
                        <StatusBadge status={status} t={t} />
                      </div>
                    </div>
                    <div className="mt-[12px] flex items-center justify-between gap-[12px]">
                      <ItemThumbs order={o} />
                      <div className="relative z-[2]"><NextStepButton order={o} t={t} busy={busy} onChange={(s) => changeStatus(o.id, s)} /></div>
                    </div>
                  </div>

                  {isOpen && (
                    <div id={`order-details-${o.id}`} className="border-t border-ink/10">
                      <OrderDetails order={o} t={t} busy={busy} copy={copy} onChange={(s) => changeStatus(o.id, s)} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <PaginationControls
        loading={loading}
        hasData={totalOrders > 0}
        page={page}
        totalPages={totalPages}
        setPage={setPage}
        t={t}
      />
    </div>
  );
}
