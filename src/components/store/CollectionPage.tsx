/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useProducts } from "@/hooks/useProducts";
import { useCategoryTree } from "@/hooks/useCategoryTree";
import { sanitizeProductList } from "@/utils/catalogSanitizer";
import { ProductCard, ProductCardSkeleton } from "./ProductCard";
import { collectionUrl, isSoldOut, money, onSale, priceRange } from "./lib/product";
import { useStoreT } from "./lib/useStoreT";
import { Drawer } from "./ui";
import { CatalogState } from "./CatalogState";

type Sort = "featured" | "best" | "newest" | "oldest" | "low" | "high";
type Filters = { inStock: boolean; outOfStock: boolean; sale: boolean; min: string; max: string };
const NO_FILTERS: Filters = { inStock: false, outOfStock: false, sale: false, min: "", max: "" };
const PAGE_SIZE = 24;
const VIRTUAL = ["all", "featured", "discounted", "bestseller"];

function useCollection(id: string) {
  const { st } = useStoreT();
  const virtual = VIRTUAL.includes(id);
  // Home, search and virtual collections share one request and one cache.
  const catalog = useProducts(virtual);
  const category = useQuery({
    queryKey: ["category-products", id],
    enabled: !virtual,
    queryFn: async ({ signal }) => {
      const res = await fetch(`${API_BASE_URL}/category/${encodeURIComponent(id)}/products-tree`, { signal });
      if (!res.ok) throw new Error("CATALOGUE_UNAVAILABLE");
      const json = await res.json();
      if (!Array.isArray(json?.products)) throw new Error("Invalid catalog response");
      return { products: sanitizeProductList(json.products), title: String(json?.category?.categoryName ?? "") };
    },
    staleTime: 15_000,
    refetchInterval: 60_000,
    retry: 1,
  });
  const products = useMemo(() => {
    if (!virtual) return category.data?.products ?? [];
    const list = catalog.data ?? [];
    if (id === "featured") return list.filter((p) => p.isFeatured);
    if (id === "discounted") return list.filter(onSale);
    if (id === "bestseller") return [...list].sort((a, b) => (b.salesCount ?? 0) - (a.salesCount ?? 0));
    return list;
  }, [virtual, id, catalog.data, category.data]);
  const title = virtual
    ? ({ all: st("all_products"), featured: st("sort_featured"), discounted: st("on_sale"), bestseller: st("sort_best") }[id] ?? "")
    : category.data?.title ?? st("all_products");
  const query = virtual ? catalog : category;
  return { products, title, loading: query.isPending, error: query.isError, retry: () => void query.refetch() };
}

export function CollectionPage({ id }: { id: string }) {
  const { st, locale } = useStoreT();
  const router = useRouter();
  const { data: categories = [] } = useCategoryTree();
  const q = (useSearchParams()?.get("q") ?? "").trim();
  const { products, title, loading, error, retry } = useCollection(id);
  const [sort, setSort] = useState<Sort>(id === "bestseller" ? "best" : "featured");
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [page, setPage] = useState(1);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => setPage(1), [sort, filters, q, id]);

  // highest price any size reaches (a size can cost more than the product price)
  const maxPrice = useMemo(() => products.reduce((maximum, product) => Math.max(maximum, priceRange(product).max || 0), 0), [products]);

  const visible = useMemo(() => {
    const min = Number(filters.min) || 0;
    const max = filters.max === "" ? Infinity : Number(filters.max);
    const term = q.toLocaleLowerCase(locale);
    const list = products.filter((p) => {
      if (term && !`${p.productName ?? ""} ${p.ingredients ?? ""}`.toLocaleLowerCase(locale).includes(term)) return false;
      const sold = isSoldOut(p);
      if (filters.inStock !== filters.outOfStock && (filters.inStock ? sold : !sold)) return false;
      if (filters.sale && !onSale(p)) return false;
      // any size within the range counts
      const { min: low, max: high } = priceRange(p);
      return high >= min && low <= max;
    });
    const time = (p: any) => new Date(p.createdAt).getTime() || 0;
    const sorters: Record<Sort, (a: any, b: any) => number> = {
      featured: (a, b) => Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured)) || time(b) - time(a),
      best: (a, b) => (b.salesCount ?? 0) - (a.salesCount ?? 0),
      newest: (a, b) => time(b) - time(a),
      oldest: (a, b) => time(a) - time(b),
      low: (a, b) => priceRange(a).min - priceRange(b).min,
      high: (a, b) => priceRange(b).max - priceRange(a).max,
    };
    return [...list].sort(sorters[sort]);
  }, [products, filters, sort, q, locale]);

  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const pageNumbers = [...new Set([1, currentPage - 1, currentPage, currentPage + 1, pages])]
    .filter((number) => number >= 1 && number <= pages).sort((a, b) => a - b);
  const shown = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const counts = useMemo(
    () => ({ in: products.filter((p) => !isSoldOut(p)).length, out: products.filter(isSoldOut).length, sale: products.filter(onSale).length }),
    [products],
  );

  const pills: { label: string; clear: Partial<Filters> }[] = [];
  if (filters.inStock) pills.push({ label: st("in_stock"), clear: { inStock: false } });
  if (filters.outOfStock) pills.push({ label: st("out_of_stock"), clear: { outOfStock: false } });
  if (filters.sale) pills.push({ label: st("on_sale"), clear: { sale: false } });
  if (filters.min || filters.max)
    pills.push({ label: `${money(Number(filters.min) || 0)} – ${money(filters.max === "" ? maxPrice : Number(filters.max))}`, clear: { min: "", max: "" } });

  const sortOptions: [Sort, string][] = [
    ["featured", st("sort_featured")],
    ["best", st("sort_best")],
    ["newest", st("sort_newest")],
    ["oldest", st("sort_oldest")],
    ["low", st("sort_low")],
    ["high", st("sort_high")],
  ];
  const countText = error ? st("catalogue_unavailable") : loading ? st("loading_products") : st(visible.length === 1 ? "product_count_one" : "products_count", { n: visible.length });
  const filtered = Boolean(q || pills.length);
  const clearFilters = () => {
    setFilters(NO_FILTERS);
    if (q) router.push(collectionUrl(locale, id));
  };

  return (
    <div className="page-width pb-[72px]">
      <div className="grid gap-6 border-b border-line pb-8 pt-8 lg:grid-cols-[1.2fr_1fr] lg:items-end lg:pt-12">
        <div><Link href={`/${locale}`} className="eyebrow link-underline">Lorentz / {st("shop")}</Link><h1 className="store-heading page-title mt-3">{q ? `“${q}”` : title || st("all_products")}</h1><p className="mt-4 max-w-lg text-sm leading-relaxed text-taupe">{st("collection_intro")}</p></div>
        <form key={q} className="collection-search lg:justify-self-end lg:max-w-sm" role="search" onSubmit={(event) => { event.preventDefault(); const term = String(new FormData(event.currentTarget).get("q") ?? "").trim(); router.push(`${collectionUrl(locale, id)}${term ? `?q=${encodeURIComponent(term)}` : ""}`); }}>
          <Search size={17} className="shrink-0 text-taupe" strokeWidth={1.4} aria-hidden /><input name="q" defaultValue={q} aria-label={st("search_products")} placeholder={st("search_products")} className="min-w-0 flex-1 bg-transparent py-3 text-ink outline-none" /><button type="submit" className="min-h-11 text-sm text-ink">{st("search")}</button>
        </form>
      </div>
      {categories.length > 0 && <nav aria-label={st("shop_by_category")} className="mt-5 flex gap-2 overflow-x-auto pb-2 text-sm"><Link href={collectionUrl(locale)} aria-current={id === "all" ? "page" : undefined} className={`inline-flex min-h-11 shrink-0 items-center border px-4 ${id === "all" ? "border-ink bg-ink text-paper" : "border-line hover:border-bronze"}`}>{st("all_products")}</Link>{categories.flatMap((category) => [category, ...(category.children ?? [])]).map((category) => <Link key={category.id} href={collectionUrl(locale, category.id)} aria-current={id === category.id ? "page" : undefined} className={`inline-flex min-h-11 shrink-0 items-center border px-4 ${id === category.id ? "border-ink bg-ink text-paper" : "border-line hover:border-bronze"}`}>{category.categoryName}</Link>)}</nav>}

      {/* Desktop facets */}
      <div className="mt-[28px] hidden xl:flex flex-wrap items-center justify-between gap-[20px] border-y border-ink/15 py-[16px]">
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
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="min-h-[44px] bg-transparent pr-[4px] text-[#1c1714] cursor-pointer">
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
      <div className="mt-[24px] flex flex-wrap items-center justify-between gap-[12px] border-y border-ink/15 py-[8px] xl:hidden text-[14px]">
        <button type="button" onClick={() => setDrawer(true)} className="flex min-h-[44px] items-center gap-[8px] text-[#1c1714]">
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
              className="flex items-center gap-[6px] min-h-[44px] px-[12px] py-[8px] text-[#1c1714] shadow-[0_0_0_1px_rgba(28,23,20,0.3)] hover:shadow-[0_0_0_1px_#1c1714]"
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
      <div className="mt-[28px] grid grid-cols-2 gap-x-[14px] gap-y-[32px] sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-[24px] lg:gap-y-[40px]">
        {loading ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />) : shown.map((p) => <ProductCard key={p.id} product={p} headingLevel={2} />)}
      </div>
      {error && <CatalogState error onAction={retry} />}
      {!loading && !error && visible.length === 0 && <CatalogState filtered={filtered} onAction={filtered ? clearFilters : undefined} />}

      {pages > 1 && (
        <nav className="mt-[48px] flex flex-wrap items-center justify-center gap-[4px] text-[15px]">
          {pageNumbers.map((number, index) => (
            <span key={number} className="inline-flex items-center gap-[4px]">
            {index > 0 && number - pageNumbers[index - 1] > 1 && <span aria-hidden="true" className="px-[6px]">…</span>}
            <button
              type="button"
              onClick={() => {
                setPage(number);
                window.scrollTo({ top: 0 });
              }}
              className={`h-[44px] min-w-[44px] px-[8px] ${currentPage === number ? "text-[#1c1714] underline underline-offset-[6px]" : "hover:text-[#1c1714] hover:underline underline-offset-[6px]"}`}
              aria-current={currentPage === number ? "page" : undefined}
            >
              {number}
            </button>
            </span>
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
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex min-h-[44px] items-center gap-[6px] text-[#1c1714] hover:underline underline-offset-[3px]">
        {label}
        <ChevronDown className={`h-[12px] w-[12px] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+10px)] z-dropdown min-w-[280px] border border-[rgba(28,23,20,0.15)] bg-white">
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
    <label className="flex min-h-[44px] cursor-pointer items-center gap-[10px] py-[8px] text-[14px] text-[#1c1714]">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-[16px] w-[16px] accent-[#1c1714]" />
      {label}
    </label>
  );
}

function PriceRange({ filters, setFilters, maxPrice }: { filters: Filters; setFilters: React.Dispatch<React.SetStateAction<Filters>>; maxPrice: number }) {
  const { st } = useStoreT();
  const fieldId = useId();
  return (
    <div className="py-[6px]">
      <p className="mb-[10px] text-[13px]">{`${st("price_to")}: ${money(maxPrice)}`}</p>
      <div className="flex items-center gap-[10px]">
        {(["min", "max"] as const).map((k) => (
          <div key={k} className="field">
            <input
              id={`${fieldId}-price-${k}`}
              inputMode="numeric"
              placeholder=" "
              value={filters[k]}
              onChange={(e) => setFilters((f) => ({ ...f, [k]: e.target.value.replace(/\D/g, "") }))}
            />
            <label htmlFor={`${fieldId}-price-${k}`}>{k === "min" ? st("price_from") : st("price_to")} ₮</label>
          </div>
        ))}
      </div>
    </div>
  );
}
