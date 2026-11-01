/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, ClipboardList, Package, Search, User } from "lucide-react";
import { api } from "@admin/lib/api";
import { useAdminNav, type AdminView } from "@admin/lib/adminNav";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { type Customer, customerLabel, formatPhone } from "@admin/lib/customers";
import { normalizeOrderId } from "@admin/utils/normalizeOrderId";
import { formatMNT } from "@admin/utils/format";
import { cn } from "@admin/lib/utils";
import { type ProductType } from "@admin/type/type";
import { type RawOrder, orderNumber } from "@/app/(admin)/admin/[locale]/(orders)/components/type";
import { customerName } from "@/app/(admin)/admin/[locale]/(orders)/components/OrderDetails";

type Result = {
  id: string;
  group: "orders" | "customers" | "products" | "go";
  icon: typeof Search;
  title: string;
  detail?: string;
  image?: string | null;
  open: () => void;
};

const typingInField = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/** One search for the whole admin (Ctrl K or "/"): orders, customers and products, or a quick jump. */
export function AdminSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useI18n();
  const { go } = useAdminNav();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [orders, setOrders] = useState<RawOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [catalog, setCatalog] = useState<ProductType[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);

  // Ctrl K / Cmd K anywhere; "/" when the owner is not typing somewhere else.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.key === "k" || event.key === "K") && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        onOpenChange(true);
      } else if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey && !typingInField(event.target)) {
        event.preventDefault();
        onOpenChange(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    if (catalog) return;
    const controller = new AbortController();
    api
      .get("/products/admin/inventory", { signal: controller.signal })
      .then(({ data }) => setCatalog(Array.isArray(data) ? data : []))
      .catch(() => {});
    return () => controller.abort();
  }, [open, catalog]);

  const term = query.trim();
  useEffect(() => {
    setActive(0);
    if (term.length < 2) {
      setOrders([]);
      setCustomers([]);
      setSearching(false);
      setFailed(false);
      return;
    }
    const controller = new AbortController();
    setSearching(true);
    const id = setTimeout(() => {
      Promise.all([
        api.get("/order", { params: { search: normalizeOrderId(term), limit: 5 }, signal: controller.signal }),
        api.get("/order/customers", { params: { search: term, limit: 5 }, signal: controller.signal }),
      ])
        .then(([orderRes, customerRes]) => {
          setOrders(Array.isArray(orderRes.data?.orders) ? orderRes.data.orders : []);
          setCustomers(Array.isArray(customerRes.data?.customers) ? customerRes.data.customers : []);
          setFailed(false);
        })
        .catch(() => { if (!controller.signal.aborted) setFailed(true); })
        .finally(() => { if (!controller.signal.aborted) setSearching(false); });
    }, 250);
    return () => {
      clearTimeout(id);
      controller.abort();
    };
  }, [term]);

  const jump = useCallback(
    (view: AdminView, params?: Record<string, string>) => () => {
      onOpenChange(false);
      go(view, params);
    },
    [go, onOpenChange],
  );

  const results = useMemo<Result[]>(() => {
    if (term.length < 2) {
      return [
        { id: "go-ship", group: "go", icon: ArrowRight, title: t("search.go.to_ship"), open: jump("orders", { tab: "to_ship" }) },
        { id: "go-pay", group: "go", icon: ArrowRight, title: t("search.go.awaiting_payment"), open: jump("orders", { tab: "awaiting_payment" }) },
        { id: "go-chats", group: "go", icon: ArrowRight, title: t("search.go.chats"), open: jump("messages", { filter: "attention" }) },
        { id: "go-restock", group: "go", icon: ArrowRight, title: t("search.go.restock"), open: jump("products", { stock: "restock" }) },
        { id: "go-customers", group: "go", icon: ArrowRight, title: t("search.go.customers"), open: jump("customers") },
        { id: "go-revenue", group: "go", icon: ArrowRight, title: t("search.go.revenue"), open: jump("revenue") },
      ];
    }
    const lower = term.toLocaleLowerCase();
    const products = (catalog ?? []).filter((p) => String(p.productName ?? "").toLocaleLowerCase().includes(lower)).slice(0, 5);
    return [
      ...orders.map<Result>((o) => ({
        id: `order-${o.id}`,
        group: "orders",
        icon: ClipboardList,
        title: `#${orderNumber(o)} · ${customerName(o, t)}`,
        detail: `${formatMNT(o.totalPrice)} · ${t(`order_status.${o.status ?? "PENDING"}`)}`,
        open: jump("orders", { order: o.id }),
      })),
      ...customers.map<Result>((c) => ({
        id: `customer-${c.phone}`,
        group: "customers",
        icon: User,
        title: customerLabel(c, t("customers.no_name")),
        detail: `${formatPhone(c.phone)} · ${t("customers.orders_count", { count: c.orders })}`,
        open: jump("customers", { customer: c.phone }),
      })),
      ...products.map<Result>((p) => ({
        id: `product-${String(p.id)}`,
        group: "products",
        icon: Package,
        title: p.productName,
        detail: formatMNT(Number(p.price)),
        image: typeof p.image === "string" ? p.image : null,
        open: jump("products", { product: String(p.id) }),
      })),
    ];
  }, [term, orders, customers, catalog, t, jump]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!results.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      results[Math.min(active, results.length - 1)]?.open();
    }
  };

  useEffect(() => {
    document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, listId]);

  const groups = (["go", "orders", "customers", "products"] as const).filter((g) => results.some((r) => r.group === g));
  const activeId = results.length ? `${listId}-${Math.min(active, results.length - 1)}` : undefined;
  const status = term.length < 2 ? "" : searching ? t("search.searching") : failed ? t("search.failed") : results.length ? t("search.results", { count: results.length }) : t("search.empty", { q: term });

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-ink/40" />
        <Dialog.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => { event.preventDefault(); inputRef.current?.focus(); }}
          className="fixed inset-x-0 top-0 z-[91] mx-auto flex max-h-[min(80dvh,620px)] w-full max-w-[640px] flex-col border border-ink/15 bg-white shadow-[0_24px_60px_-20px_rgba(28,23,20,0.35)] outline-none sm:top-[10vh]"
        >
          <Dialog.Title className="sr-only">{t("search.title")}</Dialog.Title>
          <div className="flex items-center gap-[10px] border-b border-ink/10 px-[14px]">
            <Search aria-hidden className="h-[18px] w-[18px] shrink-0 text-taupe" />
            <input
              ref={inputRef}
              type="search"
              role="combobox"
              aria-expanded={results.length > 0}
              aria-controls={listId}
              aria-activedescendant={activeId}
              aria-autocomplete="list"
              aria-label={t("search.title")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={t("search.placeholder")}
              autoComplete="off"
              className="h-[56px] min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-taupe [&::-webkit-search-cancel-button]:hidden"
            />
            <Dialog.Close className="shrink-0 border border-ink/15 px-[8px] py-[2px] text-[12px] text-taupe hover:text-ink">Esc</Dialog.Close>
          </div>

          <p role="status" className={cn("px-[16px] text-[13px] text-taupe", status && "pt-[10px]")}>{status}</p>

          <ul id={listId} role="listbox" aria-label={t("search.title")} className="min-h-0 flex-1 overflow-y-auto py-[6px]">
            {groups.map((group) => (
              <li key={group} role="presentation">
                <p aria-hidden className="px-[16px] pb-[4px] pt-[10px] text-[12px] font-medium text-taupe">{t(`search.groups.${group}`)}</p>
                <ul role="group" aria-label={t(`search.groups.${group}`)}>
                  {results.map((result, index) =>
                    result.group !== group ? null : (
                      <li
                        key={result.id}
                        id={`${listId}-${index}`}
                        role="option"
                        aria-selected={index === active}
                        onMouseMove={() => setActive(index)}
                        onClick={result.open}
                        className={cn("flex min-h-[48px] cursor-pointer items-center gap-[12px] px-[16px] py-[8px]", index === active && "bg-sand")}
                      >
                        {result.image ? (
                          <img src={result.image} alt="" className="h-[36px] w-[36px] shrink-0 bg-sand object-cover" />
                        ) : (
                          <result.icon aria-hidden className="h-[18px] w-[18px] shrink-0 text-taupe" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-medium text-ink">{result.title}</span>
                          {result.detail && <span className="block truncate text-[12px] tabular-nums text-taupe">{result.detail}</span>}
                        </span>
                      </li>
                    ),
                  )}
                </ul>
              </li>
            ))}
          </ul>

          <p className="hidden border-t border-ink/10 px-[16px] py-[8px] text-[12px] text-taupe sm:block">{t("search.hint")}</p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
