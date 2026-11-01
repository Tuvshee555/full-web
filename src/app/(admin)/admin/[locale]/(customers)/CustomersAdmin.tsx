"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Copy, MapPin, Phone, RefreshCw, SearchX, Users, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@admin/lib/api";
import { useAdminNav } from "@admin/lib/adminNav";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { PageHeader } from "@admin/components/ui/page";
import { StatCard } from "@admin/components/ui/status";
import { Pagination, SearchInput, Segmented } from "@admin/components/ui/controls";
import { EmptyState, ErrorState, LoadingRows } from "@admin/components/ui/feedback";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@admin/components/ui/sheet";
import { formatMNT, formatWhen, isGuestEmail, ubDayKey } from "@admin/utils/format";
import { cn } from "@admin/lib/utils";
import { type Customer, customerLabel, formatPhone, loadCustomer, phoneDigits } from "@admin/lib/customers";
import { RawOrder, orderNumber } from "../(orders)/components/type";
import { OrderStatusPill } from "../(orders)/components/OrderDetails";

type Sort = "recent" | "spent" | "orders";
const PAGE_SIZE = 25;

export default function CustomersAdmin() {
  const { t } = useI18n();
  const { setParams } = useAdminNav();
  const searchParams = useSearchParams();
  const openPhone = searchParams?.get("customer") ?? null;

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("recent");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [overall, setOverall] = useState<{ customers: number; repeat: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    api
      .get("/order/customers", { params: { search: search || undefined, sort, page, limit: PAGE_SIZE }, signal: controller.signal })
      .then(({ data }) => {
        setRows(Array.isArray(data?.customers) ? data.customers : []);
        setTotal(Number(data?.pagination?.total) || 0);
        // The cards describe every customer, not just the ones a search found.
        if (!search && data?.summary) setOverall(data.summary);
      })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [search, sort, page, reload]);

  const when = (iso?: string) => formatWhen(iso, { today: t("common.today"), yesterday: t("common.yesterday") });
  const listed = openPhone ? rows.find((c) => c.phone === openPhone) ?? null : null;
  const repeatShare = overall?.customers ? Math.round((overall.repeat / overall.customers) * 100) : 0;
  const sorts: { value: Sort; label: string }[] = [
    { value: "recent", label: t("customers.sort.recent") },
    { value: "spent", label: t("customers.sort.spent") },
    { value: "orders", label: t("customers.sort.orders") },
  ];

  return (
    <div className="w-full">
      <PageHeader
        title={t("customers.title")}
        description={t("customers.description")}
        actions={
          <button type="button" onClick={() => setReload((v) => v + 1)} disabled={loading} className="btn-secondary">
            <RefreshCw aria-hidden className={cn("h-[15px] w-[15px]", loading && "animate-spin")} />
            {t("common.refresh")}
          </button>
        }
      />

      <section aria-label={t("customers.title")} className="mb-[16px] grid grid-cols-2 gap-[12px] lg:max-w-[640px]">
        <StatCard label={t("customers.stats.customers")} value={overall ? String(overall.customers) : "—"} loading={!overall && loading} />
        <StatCard
          label={t("customers.stats.repeat")}
          value={overall ? String(overall.repeat) : "—"}
          hint={overall?.customers ? t("customers.stats.repeat_hint", { pct: repeatShare }) : undefined}
          loading={!overall && loading}
        />
      </section>

      <div className="mb-[12px] flex flex-wrap items-center gap-[12px]">
        <SearchInput value={searchInput} onChange={setSearchInput} placeholder={t("customers.search")} className="w-full sm:max-w-[360px]" />
        <Segmented label={t("customers.sort_label")} options={sorts} value={sort} onChange={(value) => { setSort(value); setPage(1); }} />
        {!loading && !failed && (
          <p className="text-[13px] text-taupe" aria-live="polite">
            {search ? t("customers.found", { count: total }) : t("customers.total", { count: total })}
          </p>
        )}
      </div>

      {failed && <ErrorState className="mb-[12px]" message={t("customers.errors.load_failed")} onRetry={() => setReload((v) => v + 1)} retrying={loading} />}

      {loading && !rows.length ? (
        <div className="admin-surface"><LoadingRows rows={6} rowClassName="h-[56px]" /></div>
      ) : !rows.length ? (
        !failed && (
          <div className="admin-surface">
            <EmptyState
              icon={search ? SearchX : Users}
              title={t(search ? "customers.empty_search.title" : "customers.empty.title")}
              description={t(search ? "customers.empty_search.body" : "customers.empty.body")}
              action={search ? <button type="button" className="btn-secondary" onClick={() => setSearchInput("")}>{t("common.clear_search")}</button> : undefined}
            />
          </div>
        )
      ) : (
        <div className={cn("admin-surface transition-opacity", loading && "opacity-70")}>
          <table className="hidden w-full text-[14px] lg:table">
            <caption className="sr-only">{t("customers.title")}</caption>
            <thead className="border-b border-ink/10">
              <tr>
                <th scope="col" className="admin-th">{t("customers.col.customer")}</th>
                <th scope="col" className="admin-th">{t("customers.col.place")}</th>
                <th scope="col" className="admin-th text-right">{t("customers.col.orders")}</th>
                <th scope="col" className="admin-th text-right">{t("customers.col.spent")}</th>
                <th scope="col" className="admin-th">{t("customers.col.last")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {rows.map((c) => {
                const name = customerLabel(c, t("customers.no_name"));
                return (
                  <tr key={c.phone} onClick={() => setParams({ customer: c.phone }, "push")} className={cn("cursor-pointer transition-colors hover:bg-paper", openPhone === c.phone && "bg-paper")}>
                    <td className="admin-td">
                      <button type="button" onClick={(e) => { e.stopPropagation(); setParams({ customer: c.phone }, "push"); }} className="text-left font-medium text-ink underline-offset-4 hover:underline" aria-label={t("customers.open", { name })}>
                        {name}
                      </button>
                      <p className="text-[12px] tabular-nums text-taupe">{formatPhone(c.phone)}</p>
                    </td>
                    <td className="admin-td text-taupe">{[c.district, c.city].filter(Boolean).join(", ") || "—"}</td>
                    <td className="admin-td text-right tabular-nums">
                      {c.orders}
                      {c.paidOrders >= 2 && <span className="ml-[8px] border border-ink/15 px-[6px] py-[1px] text-[11px] text-ink">{t("customers.repeat_badge")}</span>}
                    </td>
                    <td className="admin-td text-right font-medium tabular-nums">{formatMNT(c.spent)}</td>
                    <td className="admin-td tabular-nums text-taupe">{when(c.lastOrderAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <ul className="divide-y divide-ink/10 lg:hidden">
            {rows.map((c) => {
              const name = customerLabel(c, t("customers.no_name"));
              return (
                <li key={c.phone}>
                  <button type="button" onClick={() => setParams({ customer: c.phone }, "push")} className="flex w-full items-start justify-between gap-[12px] px-[14px] py-[12px] text-left">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-ink">{name}</span>
                      <span className="block text-[13px] tabular-nums text-taupe">{formatPhone(c.phone)} · {t("customers.orders_count", { count: c.orders })}</span>
                      <span className="block text-[12px] text-taupe">{when(c.lastOrderAt)}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-[15px] font-semibold tabular-nums text-ink">{formatMNT(c.spent)}</span>
                      {c.paidOrders >= 2 && <span className="mt-[4px] inline-block border border-ink/15 px-[6px] py-[1px] text-[11px] text-ink">{t("customers.repeat_badge")}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={(p) => { setPage(p); window.scrollTo({ top: 0 }); }} disabled={loading} />
        </div>
      )}

      <CustomerDrawer phone={openPhone} listed={listed} onClose={() => setParams({ customer: null })} />
    </div>
  );
}

function CustomerDrawer({ phone, listed, onClose }: { phone: string | null; listed: Customer | null; onClose: () => void }) {
  const { t } = useI18n();
  const { go } = useAdminNav();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<RawOrder[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!phone) return;
    const controller = new AbortController();
    setCustomer(listed);
    setOrders(null);
    setFailed(false);
    void Promise.all([
      listed ? Promise.resolve(listed) : loadCustomer(phone, controller.signal),
      // The order search also matches parts of numbers, so keep only this exact phone.
      api.get("/order", { params: { search: phone, limit: 50 }, signal: controller.signal }).then(({ data }) =>
        (Array.isArray(data?.orders) ? (data.orders as RawOrder[]) : []).filter((o) => phoneDigits(o.phone) === phoneDigits(phone)),
      ),
    ])
      .then(([found, list]) => {
        setCustomer(found);
        setOrders(list);
      })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
    // "listed" only seeds the first paint; a new list must not refetch an open customer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone, attempt]);

  const copy = useCallback(async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t("orders.drawer.phone_copied"));
    } catch {
      toast.error(t("common.copy_failed"));
    }
  }, [t]);

  const when = (iso?: string) => formatWhen(iso, { today: t("common.today"), yesterday: t("common.yesterday") });
  const name = customer ? customerLabel(customer, t("customers.no_name")) : t("customers.drawer.title");
  const average = customer && customer.paidOrders ? customer.spent / customer.paidOrders : 0;
  const email = customer?.email && !isGuestEmail(customer.email) ? customer.email : null;
  const stats = useMemo(
    () =>
      customer
        ? [
            { label: t("customers.drawer.orders"), value: String(customer.orders), hint: t("customers.paid_count", { count: customer.paidOrders }) },
            { label: t("customers.drawer.spent"), value: formatMNT(customer.spent) },
            { label: t("customers.drawer.average"), value: average ? formatMNT(average) : "—" },
          ]
        : [],
    [customer, average, t],
  );

  return (
    <Sheet open={Boolean(phone)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" hideClose className="flex w-full flex-col gap-0 border-l border-ink/10 bg-paper p-0 sm:max-w-[520px]">
        <div className="flex shrink-0 items-start justify-between gap-[12px] border-b border-ink/10 bg-white px-[16px] py-[14px] sm:px-[20px]">
          <div className="min-w-0">
            <SheetTitle className="truncate text-[18px] font-semibold text-ink">{name}</SheetTitle>
            <SheetDescription className="mt-[2px] text-[13px] tabular-nums text-taupe">
              {customer ? t("customers.drawer.since", { date: ubDayKey(new Date(customer.firstOrderAt)).replaceAll("-", ".") }) : " "}
            </SheetDescription>
          </div>
          <button type="button" onClick={onClose} aria-label={t("common.close")} className="flex h-[44px] w-[44px] shrink-0 items-center justify-center text-taupe hover:bg-sand hover:text-ink">
            <X aria-hidden className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-[14px] overflow-y-auto p-[16px] sm:p-[20px]">
          {failed ? (
            <ErrorState message={t("customers.errors.orders_failed")} onRetry={() => setAttempt((v) => v + 1)} />
          ) : !customer ? (
            <LoadingRows rows={4} />
          ) : (
            <>
              <section className="admin-surface p-[16px]">
                <div className="flex flex-wrap gap-[8px]">
                  <a href={`tel:${customer.phone}`} className="btn-secondary btn-sm">
                    <Phone aria-hidden className="h-[14px] w-[14px]" />
                    {t("orders.drawer.call", { phone: formatPhone(customer.phone) })}
                  </a>
                  <button type="button" onClick={() => void copy(customer.phone)} className="btn-ghost btn-sm">
                    <Copy aria-hidden className="h-[14px] w-[14px]" />
                    {t("orders.drawer.copy_phone")}
                  </button>
                </div>
                {(customer.city || customer.district) && (
                  <p className="mt-[12px] flex items-start gap-[8px] text-[14px] text-ink">
                    <MapPin aria-hidden className="mt-[3px] h-[15px] w-[15px] shrink-0 text-taupe" />
                    {[customer.district, customer.city].filter(Boolean).join(", ")}
                  </p>
                )}
                {email && (
                  <p className="mt-[8px] text-[13px] text-taupe">
                    {t("customers.drawer.email")}: <span className="text-ink">{email}</span>
                  </p>
                )}
              </section>

              <dl className="grid grid-cols-3 gap-[8px]">
                {stats.map((s) => (
                  <div key={s.label} className="admin-surface p-[12px]">
                    <dt className="text-[12px] text-taupe">{s.label}</dt>
                    <dd className="mt-[4px] text-[16px] font-semibold tabular-nums text-ink">{s.value}</dd>
                    {s.hint && <dd className="text-[12px] text-taupe">{s.hint}</dd>}
                  </div>
                ))}
              </dl>

              <section className="admin-surface">
                <h3 className="border-b border-ink/10 px-[16px] py-[12px] text-[13px] font-semibold text-ink">{t("customers.drawer.history")}</h3>
                {!orders ? (
                  <LoadingRows rows={3} rowClassName="h-[48px]" />
                ) : (
                  <ul className="divide-y divide-ink/10">
                    {orders.map((o) => (
                      <li key={o.id}>
                        <button
                          type="button"
                          onClick={() => go("orders", { order: o.id })}
                          title={t("customers.drawer.open_order", { order: orderNumber(o) })}
                          className="flex w-full items-center justify-between gap-[12px] px-[16px] py-[10px] text-left hover:bg-paper"
                        >
                          <span className="min-w-0">
                            <span className="block text-[14px] font-medium text-ink">#{orderNumber(o)}</span>
                            <span className="block text-[12px] tabular-nums text-taupe">{when(o.createdAt)}</span>
                          </span>
                          <span className="flex shrink-0 items-center gap-[10px]">
                            <OrderStatusPill order={o} t={t} />
                            <span className="w-[88px] text-right text-[14px] font-medium tabular-nums">{formatMNT(o.totalPrice)}</span>
                            <ArrowRight aria-hidden className="h-[14px] w-[14px] text-taupe" />
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
