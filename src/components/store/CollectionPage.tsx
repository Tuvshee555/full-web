/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { sanitizeFoodList } from "@/utils/catalogSanitizer";
import { ProductCard, ProductCardSkeleton } from "./ProductCard";
import { isSoldOut, money, onSale } from "./lib/product";
import { STORE } from "@/config/store";
import { useStoreT } from "./lib/useStoreT";
import { Drawer } from "./ui";

type Sort = "featured" | "best" | "newest" | "oldest" | "low" | "high";
type Filters = { inStock: boolean; outOfStock: boolean; sale: boolean; min: string; max: string };
const NO_FILTERS: Filters = { inStock: false, outOfStock: false, sale: false, min: "", max: "" };
const PAGE_SIZE = 24;
const VIRTUAL = ["all", "featured", "discounted", "bestseller"];

function useCollection(id: string) {
  const { st } = useStoreT();
  const [products, setProducts] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    (async () => {
      try {
        if (VIRTUAL.includes(id)) {
          const res = await fetch(`${API_BASE_URL}/food`, { signal: ctrl.signal });
          let list = sanitizeFoodList(await res.json().catch(() => []));
          if (id === "featured") list = list.filter((p: any) => p.isFeatured);
          if (id === "discounted") list = list.filter(onSale);
          if (id === "bestseller") list = [...list].sort((a: any, b: any) => (b.salesCount ?? 0) - (a.salesCount ?? 0));
          setProducts(list);
          setTitle(
            { all: st("all_products"), featured: st("sort_featured"), discounted: st("on_sale"), bestseller: st("sort_best") }[id] ?? "",
          );
        } else {
          const res = await fetch(`${API_BASE_URL}/category/${id}/foods-tree`, { signal: ctrl.signal });
          const json = await res.json().catch(() => ({}));
          setProducts(sanitizeFoodList(json?.foods ?? []));
          setTitle(json?.category?.categoryName ?? st("all_products"));
        }
      } catch {
        if (!ctrl.signal.aborted) setProducts([]);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [id, st]);

  return { products, title, loading };
}

export function CollectionPage({ id }: { id: string }) {
  const { st } = useStoreT();
  const q = (useSearchParams()?.get("q") ?? "").trim();
  const { products, title, loading } = useCollection(id);
  const [sort, setSort] = useState<Sort>(id === "bestseller" ? "best" : "featured");
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [page, setPage] = useState(1);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => setPage(1), [sort, filters, q, id]);

  const maxPrice = useMemo(() => Math.max(0, ...products.map((p) => Number(p.price) || 0)), [products]);

  const visible = useMemo(() => {
    const min = Number(filters.min) || 0;
    const max = Number(filters.max) || Infinity;
    const term = q.toLowerCase();
    const list = products.filter((p) => {
      if (term && !String(p.foodName ?? "").toLowerCase().includes(term)) return false;
      const sold = isSoldOut(p);
      if (filters.inStock !== filters.outOfStock && (filters.inStock ? sold : !sold)) return false;
      if (filters.sale && !onSale(p)) return false;
      const price = Number(p.price) || 0;
      return price >= min && price <= max;
    });
    const time = (p: any) => new Date(p.createdAt).getTime() || 0;
    const sorters: Record<Sort, (a: any, b: any) => number> = {
      featured: (a, b) => Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured)) || time(b) - time(a),
      best: (a, b) => (b.salesCount ?? 0) - (a.salesCount ?? 0),
      newest: (a, b) => time(b) - time(a),
      oldest: (a, b) => time(a) - time(b),
      low: (a, b) => a.price - b.price,
      high: (a, b) => b.price - a.price,
    };
    return [...list].sort(sorters[sort]);
  }, [products, filters, sort, q]);

  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const shown = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const counts = useMemo(
    () => ({ in: products.filter((p) => !isSoldOut(p)).length, out: products.filter(isSoldOut).length, sale: products.filter(onSale).length }),
    [products],
  );

  const pills: { label: string; clear: Partial<Filters> }[] = [];
  if (filters.inStock) pills.push({ label: st("in_stock"), clear: { inStock: false } });
  if (filters.outOfStock) pills.push({ label: st("out_of_stock"), clear: { outOfStock: false } });
  if (filters.sale) pills.push({ label: st("on_sale"), clear: { sale: false } });
  if (filters.min || filters.max)
    pills.push({ label: `${money(Number(filters.min) || 0)} – ${money(Number(filters.max) || maxPrice)}`, clear: { min: "", max: "" } });

  const sortOptions: [Sort, string][] = [
    ["featured", st("sort_featured")],
    ["best", st("sort_best")],
    ["newest", st("sort_newest")],
    ["oldest", st("sort_oldest")],
    ["low", st("sort_low")],
    ["high", st("sort_high")],
  ];
  const countText = st("products_count", { n: visible.length });

  return (
    <div className="page-width pb-[72px]">
      <span className="eyebrow mt-[40px] md:mt-[72px]">{STORE.name}</span>
      <h1 className="store-heading mt-[10px] text-[48px] md:text-[80px]">{q ? `“${q}”` : title || " "}</h1>

      {/* Desktop facets */}
      <div className="mt-[24px] hidden md:flex items-start justify-between gap-[20px]">
        <div className="flex items-center gap-[24px] text-[14px]">
          <span>{st("filter")}:</span>
          <Facet label={st("availability")} selected={Number(filters.inStock) + Number(filters.outOfStock)} onReset={() => setFilters((f) => ({ ...f, inStock: false, outOfStock: false }))}>
            <Check label={`${st("in_stock")} (${counts.in})`} checked={filters.inStock} onChange={(v) => setFilters((f) => ({ ...f, inStock: v }))} />
            <Check label={`${st("out_of_stock")} (${counts.out})`} checked={filters.outOfStock} onChange={(v) => setFilters((f) => ({ ...f, outOfStock: v }))} />
          </Facet>
          <Facet label={st("price")} selected={filters.min || filters.max ? 1 : 0} onReset={() => setFilters((f) => ({ ...f, min: "", max: "" }))}>
            <PriceRange filters={filters} setFilters={setFilters} maxPrice={maxPrice} />
          </Facet>
          <Facet label={st("on_sale")} selected={Number(filters.sale)} onReset={() => setFilters((f) => ({ ...f, sale: false }))}>
            <Check label={`${st("on_sale")} (${counts.sale})`} checked={filters.sale} onChange={(v) => setFilters((f) => ({ ...f, sale: v }))} />
          </Facet>
        </div>
        <div className="flex items-center gap-[24px] text-[14px]">
          <label className="flex items-center gap-[8px]">
            {st("sort_by")}:
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="bg-transparent pr-[4px] text-[#1c1714] outline-none cursor-pointer">
              {sortOptions.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <span>{countText}</span>
        </div>
      </div>

      {/* Mobile facets */}
      <div className="mt-[20px] flex items-center justify-between md:hidden text-[14px]">
        <button type="button" onClick={() => setDrawer(true)} className="flex items-center gap-[8px] text-[#1c1714]">
          <SlidersHorizontal className="h-[16px] w-[16px]" strokeWidth={1.4} />
          {st("filter_and_sort")}
        </button>
        <span>{countText}</span>
      </div>

      {pills.length > 0 && (
        <div className="mt-[16px] flex flex-wrap items-center gap-[10px] text-[14px]">
          {pills.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setFilters((f) => ({ ...f, ...p.clear }))}
              className="flex items-center gap-[6px] rounded-[40px] px-[12px] py-[5px] text-[#1c1714] shadow-[0_0_0_1px_rgba(28,23,20,0.3)] hover:shadow-[0_0_0_1px_#1c1714]"
            >
              {p.label}
              <X className="h-[12px] w-[12px]" />
            </button>
          ))}
          <button type="button" onClick={() => setFilters(NO_FILTERS)} className="underline underline-offset-[3px] text-[#1c1714]">
            {st("clear_all")}
          </button>
        </div>
      )}

      {/* Grid */}
      <div className="mt-[32px] grid grid-cols-2 gap-x-[12px] gap-y-[44px] md:grid-cols-4 md:gap-x-[24px] md:gap-y-[64px]">
        {loading ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />) : shown.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
      {!loading && visible.length === 0 && <p className="py-[60px] text-center">{st("no_products")}</p>}

      {pages > 1 && (
        <nav className="mt-[48px] flex justify-center gap-[4px] text-[15px]">
          {Array.from({ length: pages }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setPage(i + 1);
                window.scrollTo({ top: 0 });
              }}
              className={`h-[44px] min-w-[44px] px-[8px] ${page === i + 1 ? "text-[#1c1714] underline underline-offset-[6px]" : "hover:text-[#1c1714] hover:underline underline-offset-[6px]"}`}
              aria-current={page === i + 1 ? "page" : undefined}
            >
              {i + 1}
            </button>
          ))}
        </nav>
      )}

      {/* Mobile filter drawer */}
      <Drawer open={drawer} onClose={() => setDrawer(false)} title={<span className="text-[18px]">{st("filter_and_sort")}</span>} widthClass="w-[360px]">
        <div className="flex-1 overflow-y-auto px-[20px] text-[15px]">
          <p className="pb-[10px] text-[13px]">{countText}</p>
          <MobileGroup title={st("availability")}>
            <Check label={`${st("in_stock")} (${counts.in})`} checked={filters.inStock} onChange={(v) => setFilters((f) => ({ ...f, inStock: v }))} />
            <Check label={`${st("out_of_stock")} (${counts.out})`} checked={filters.outOfStock} onChange={(v) => setFilters((f) => ({ ...f, outOfStock: v }))} />
          </MobileGroup>
          <MobileGroup title={st("price")}>
            <PriceRange filters={filters} setFilters={setFilters} maxPrice={maxPrice} />
          </MobileGroup>
          <MobileGroup title={st("on_sale")}>
            <Check label={`${st("on_sale")} (${counts.sale})`} checked={filters.sale} onChange={(v) => setFilters((f) => ({ ...f, sale: v }))} />
          </MobileGroup>
          <div className="border-t border-[rgba(28,23,20,0.08)] py-[16px]">
            <label className="field">
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                {sortOptions.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute left-[15px] top-[4px] text-[11px] text-[rgba(28,23,20,0.6)]">{st("sort_by")}</span>
            </label>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-[10px] border-t border-[rgba(28,23,20,0.08)] p-[20px]">
          <button type="button" className="btn-secondary" onClick={() => setFilters(NO_FILTERS)}>
            {st("reset")}
          </button>
          <button type="button" className="btn" onClick={() => setDrawer(false)}>
            {st("apply")}
          </button>
        </div>
      </Drawer>
    </div>
  );
}

function Facet({ label, selected, onReset, children }: { label: string; selected: number; onReset: () => void; children: React.ReactNode }) {
  const { st } = useStoreT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center gap-[6px] text-[#1c1714] hover:underline underline-offset-[3px]">
        {label}
        <ChevronDown className={`h-[12px] w-[12px] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+10px)] z-30 min-w-[280px] border border-[rgba(28,23,20,0.15)] bg-white">
          <div className="flex items-center justify-between border-b border-[rgba(28,23,20,0.08)] px-[20px] py-[12px] text-[13px]">
            <span>{selected ? `${selected} ✓` : " "}</span>
            <button type="button" onClick={onReset} className="underline underline-offset-[3px] text-[#1c1714]">
              {st("reset")}
            </button>
          </div>
          <div className="px-[20px] py-[10px]">{children}</div>
        </div>
      )}
    </div>
  );
}

function MobileGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-[rgba(28,23,20,0.08)] py-[14px]">
      <p className="mb-[8px] text-[#1c1714]">{title}</p>
      {children}
    </div>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-[10px] py-[6px] text-[14px] text-[#1c1714]">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-[16px] w-[16px] accent-[#1c1714]" />
      {label}
    </label>
  );
}

function PriceRange({ filters, setFilters, maxPrice }: { filters: Filters; setFilters: React.Dispatch<React.SetStateAction<Filters>>; maxPrice: number }) {
  const { st } = useStoreT();
  return (
    <div className="py-[6px]">
      <p className="mb-[10px] text-[13px]">{`${st("price_to")}: ${money(maxPrice)}`}</p>
      <div className="flex items-center gap-[10px]">
        {(["min", "max"] as const).map((k) => (
          <div key={k} className="field">
            <input
              id={`price-${k}`}
              inputMode="numeric"
              placeholder=" "
              value={filters[k]}
              onChange={(e) => setFilters((f) => ({ ...f, [k]: e.target.value.replace(/\D/g, "") }))}
            />
            <label htmlFor={`price-${k}`}>{k === "min" ? st("price_from") : st("price_to")} ₮</label>
          </div>
        ))}
      </div>
    </div>
  );
}
