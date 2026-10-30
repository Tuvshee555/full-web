/* eslint-disable @next/next/no-img-element */
"use client";

import { ChevronRight, ImageOff, Pencil, Star } from "lucide-react";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { ProductType } from "@admin/type/type";
import { formatMNT, formatNumber } from "@admin/utils/format";
import { StockSummary, stockSummary } from "@admin/utils/inventory";
import { StatusPill, type Tone } from "@admin/components/ui/status";
import { Checkbox } from "@admin/components/ui/controls";
import { cn } from "@admin/lib/utils";

type Props = {
  products: ProductType[];
  categoryName: (id: string | null | undefined) => string;
  onEdit: (product: ProductType) => void;
  onToggleFeatured: (product: ProductType) => void;
  busyFeatured?: string[];
  selected: Set<string>;
  onSelect: (id: string, on: boolean) => void;
  onSelectAll: (on: boolean) => void;
};

const thumb = (f: ProductType) => (typeof f.image === "string" && f.image.trim() ? f.image : null);

export const STOCK_TONE: Record<StockSummary["state"], Tone> = {
  ok: "success",
  low: "attention",
  partial: "attention",
  soldout: "danger",
  untracked: "neutral",
};

/** Price, or the range when options have their own prices, plus the sale line. */
function priceInfo(f: ProductType) {
  const price = Number(f.price);
  const old = Number(f.oldPrice);
  const sizePrices = (Array.isArray(f.sizes) ? f.sizes : []).map((s) => {
    const own = typeof s === "object" && s !== null ? Number((s as { price?: number | null }).price) : NaN;
    return Number.isFinite(own) && own > 0 ? own : price;
  });
  const low = sizePrices.length ? Math.min(...sizePrices) : price;
  const high = sizePrices.length ? Math.max(...sizePrices) : price;
  return {
    text: low === high ? formatMNT(low) : `${formatMNT(low)} – ${formatMNT(high)}`,
    sale: old > price ? { old: formatMNT(old), pct: Math.round((1 - price / old) * 100) } : null,
  };
}

export function StockCell({ product, compact }: { product: ProductType; compact?: boolean }) {
  const { t } = useI18n();
  const stock = stockSummary(product.sizes);
  const options = (Array.isArray(product.sizes) ? product.sizes : []).filter((s): s is { label: string; stock?: number | null } => typeof s === "object" && s !== null);
  // Only the healthy state shows a total; otherwise the option breakdown below says which one needs stock.
  const label = stock.state === "ok" ? t("stock.in_stock", { count: formatNumber(stock.total) }) : t(`stock.state.${stock.state}`);
  const problems = [
    ...stock.soldOut.map((option) => t("overview.stock.option_soldout", { option })),
    ...stock.low.map((s) => t("overview.stock.option_low", { option: s.label, count: s.stock })),
  ];
  return (
    <span className="block min-w-0">
      <StatusPill tone={STOCK_TONE[stock.state]}>{label}</StatusPill>
      {compact && stock.state !== "soldout" && problems.length > 0 && (
        <span className="mt-[3px] block truncate text-[12px] text-taupe">{problems.join(" · ")}</span>
      )}
      {!compact && options.length > 1 && (
        <span className="mt-[4px] block truncate text-[12px] tabular-nums text-taupe" title={options.map((o) => `${o.label}: ${o.stock ?? "—"}`).join(", ")}>
          {options.slice(0, 4).map((o) => `${o.label} ${o.stock ?? "—"}`).join(" · ")}
          {options.length > 4 ? ` · +${options.length - 4}` : ""}
        </span>
      )}
    </span>
  );
}

function Thumb({ product, className = "h-[56px] w-[56px]" }: { product: ProductType; className?: string }) {
  const img = thumb(product);
  return (
    <div className={cn("shrink-0 overflow-hidden bg-sand", className)}>
      {img ? (
        <img src={img} alt="" loading="lazy" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/product-image-coming-soon.svg"; }} className="h-full w-full object-contain p-1" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-taupe">
          <ImageOff aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.2} />
        </div>
      )}
    </div>
  );
}

export function ProductList({ products, categoryName, onEdit, onToggleFeatured, busyFeatured = [], selected, onSelect, onSelectAll }: Props) {
  const { t } = useI18n();
  const allSelected = products.length > 0 && products.every((p) => selected.has(String(p.id)));
  const someSelected = products.some((p) => selected.has(String(p.id)));

  return (
    <>
      {/* Laptop and desktop */}
      <table className="hidden w-full text-[14px] lg:table">
        <caption className="sr-only">{t("products.title")}</caption>
        <thead className="border-b border-ink/10">
          <tr>
            <th scope="col" className="w-[44px] pl-[4px]">
              <Checkbox checked={allSelected} indeterminate={!allSelected && someSelected} onChange={onSelectAll} label={t("bulk.select_page")} />
            </th>
            <th scope="col" className="admin-th" colSpan={2}>{t("products.col.product")}</th>
            <th scope="col" className="admin-th text-right">{t("products.col.price")}</th>
            <th scope="col" className="admin-th">{t("products.col.stock")}</th>
            <th scope="col" className="admin-th hidden xl:table-cell">{t("products.col.home")}</th>
            <th scope="col" className="admin-th"><span className="sr-only">{t("products.col.actions")}</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink/10">
          {products.map((f) => {
            const id = String(f.id);
            const price = priceInfo(f);
            const isSelected = selected.has(id);
            return (
              <tr key={id} onClick={() => onEdit(f)} className={cn("cursor-pointer transition-colors hover:bg-paper", isSelected && "bg-sand/50")}>
                <td className="w-[44px] pl-[4px]" onClick={(e) => e.stopPropagation()}>
                  <Checkbox checked={isSelected} onChange={(on) => onSelect(id, on)} label={t("bulk.select_product", { name: f.productName })} />
                </td>
                <td className="w-[52px] py-[8px] pl-[4px] xl:w-[64px]"><Thumb product={f} className="h-[44px] w-[44px] xl:h-[52px] xl:w-[52px]" /></td>
                <td className="admin-td max-w-[220px] xl:max-w-[320px]">
                  <p className="truncate font-medium text-ink">{f.productName}</p>
                  <p className="truncate text-[12px] text-taupe">
                    {categoryName(f.categoryId)}
                    {f.isFeatured && <span className="xl:hidden"> · ★ {t("products.featured_on")}</span>}
                  </p>
                </td>
                <td className="admin-td text-right tabular-nums xl:whitespace-nowrap">
                  <span className="block font-medium text-ink">{price.text}</span>
                  {price.sale && (
                    <span className="block text-[12px] text-taupe">
                      <span className="line-through">{price.sale.old}</span>
                      <span className="ml-[6px] text-terracotta">−{price.sale.pct}%</span>
                    </span>
                  )}
                </td>
                <td className="admin-td max-w-[200px] xl:max-w-[240px]"><StockCell product={f} /></td>
                <td className="admin-td hidden xl:table-cell" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => onToggleFeatured(f)}
                    aria-pressed={f.isFeatured}
                    disabled={busyFeatured.includes(id)}
                    title={t("products.featured_hint")}
                    className={cn("inline-flex min-h-[36px] items-center gap-[6px] border px-[10px] text-[13px] transition-colors disabled:opacity-40 [@media(pointer:coarse)]:min-h-[44px]", f.isFeatured ? "border-ink bg-ink text-paper" : "border-ink/20 bg-white text-taupe hover:border-ink/50 hover:text-ink")}
                  >
                    <Star aria-hidden className={cn("h-[14px] w-[14px]", f.isFeatured && "fill-paper")} strokeWidth={1.6} />
                    {t(f.isFeatured ? "products.featured_on" : "products.featured_off")}
                    <span className="sr-only">: {f.productName}</span>
                  </button>
                </td>
                <td className="admin-td text-right" onClick={(e) => e.stopPropagation()}>
                  <button type="button" onClick={() => onEdit(f)} className="btn-secondary btn-sm">
                    <Pencil aria-hidden className="h-[13px] w-[13px]" strokeWidth={1.6} />
                    {t("common.edit")}
                    <span className="sr-only">: {f.productName}</span>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Phones and tablets */}
      <ul className="divide-y divide-ink/10 lg:hidden">
        {products.map((f) => {
          const id = String(f.id);
          const price = priceInfo(f);
          const isSelected = selected.has(id);
          return (
            <li key={id} className={cn("relative flex items-center gap-[8px] py-[10px] pl-[2px] pr-[12px]", isSelected && "bg-sand/50")}>
              <Checkbox checked={isSelected} onChange={(on) => onSelect(id, on)} label={t("bulk.select_product", { name: f.productName })} />
              <Thumb product={f} />
              <button type="button" onClick={() => onEdit(f)} className="min-w-0 flex-1 text-left after:absolute after:inset-0 after:content-['']">
                <span className="flex items-center gap-[6px]">
                  <span className="truncate text-[15px] font-medium text-ink">{f.productName}</span>
                  {f.isFeatured && <Star aria-label={t("products.featured_on")} className="h-[13px] w-[13px] shrink-0 fill-ink text-ink" strokeWidth={1.6} />}
                </span>
                <span className="mt-[1px] block text-[13px] tabular-nums text-ink">
                  {price.text}
                  {price.sale && <span className="ml-[6px] text-terracotta">−{price.sale.pct}%</span>}
                </span>
                <span className="mt-[4px] block"><StockCell product={f} compact /></span>
                <span className="sr-only">{t("common.edit")}</span>
              </button>
              <ChevronRight aria-hidden className="h-[18px] w-[18px] shrink-0 text-ink/40" strokeWidth={1.5} />
            </li>
          );
        })}
      </ul>
    </>
  );
}
