/* eslint-disable @next/next/no-img-element */
"use client";

import { ChevronRight, ImageOff, PackageX, Pencil, Star } from "lucide-react";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { ProductType } from "@admin/type/type";
import { formatMNT } from "@admin/utils/format";
import { StockBadge } from "@/components/store/StockBadge";

type Props = {
  products: ProductType[];
  categoryName: (id: string) => string;
  showCategory: boolean;
  onEdit: (product: ProductType) => void;
  onToggleFeatured: (product: ProductType) => void;
  emptyText: string;
  busyFeatured?: string[];
};

const thumb = (f: ProductType) => (typeof f.image === "string" && f.image.trim() ? f.image : null);

export function ProductList({ products, categoryName, showCategory, onEdit, onToggleFeatured, emptyText, busyFeatured = [] }: Props) {
  const { t, locale } = useI18n();

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-[10px] border border-ink/10 bg-white px-[24px] py-[64px] text-center">
        <PackageX className="h-[28px] w-[28px] text-taupe" strokeWidth={1.2} />
        <p className="text-[14px] text-taupe">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="border border-ink/10 bg-white">
      {/* Column labels (desktop) */}
      <div className="hidden grid-cols-[56px_minmax(0,1fr)_140px_44px_72px] items-center gap-[16px] border-b border-ink/10 px-[16px] py-[10px] text-[12px] font-medium text-taupe xl:grid">
        <span />
        <span>{t("editor.name")}</span>
        <span className="text-right">{t("editor.price")}</span>
        <span className="text-center" title={t("product.fields.featured")}>
          <Star className="mx-auto h-[13px] w-[13px]" strokeWidth={1.6} />
        </span>
        <span />
      </div>

      <ul className="divide-y divide-ink/10">
        {products.map((f) => {
          const img = thumb(f);
          const price = Number(f.price);
          const old = Number(f.oldPrice);
          const onSale = old > price;
          // sizes with their own price: show the range, e.g. 59,900₮ – 89,900₮
          const sizePrices = (Array.isArray(f.sizes) ? f.sizes : []).map((s) => {
            const own = typeof s === "object" && s !== null ? Number((s as { price?: number | null }).price) : NaN;
            return Number.isFinite(own) && own > 0 ? own : price;
          });
          const low = sizePrices.length ? Math.min(...sizePrices) : price;
          const high = sizePrices.length ? Math.max(...sizePrices) : price;
          const priceText = low === high ? formatMNT(low) : `${formatMNT(low)} – ${formatMNT(high)}`;
          return (
            <li key={String(f.id)}>
              <div
                className="relative grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-[14px] px-[12px] py-[10px] transition-colors hover:bg-paper xl:grid-cols-[56px_minmax(0,1fr)_140px_44px_72px] xl:gap-[16px] xl:px-[16px]"
              >
                <button type="button" onClick={() => onEdit(f)} aria-label={`${t("editor.edit")}: ${f.productName}`} className="absolute inset-0 z-[1]" />
                <div className="h-[56px] w-[56px] overflow-hidden bg-sand">
                  {img ? (
                    <img src={img} alt="" loading="lazy" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/product-image-coming-soon.svg"; }} className="h-full w-full object-contain p-1" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-taupe">
                      <ImageOff className="h-[18px] w-[18px]" strokeWidth={1.2} />
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-[8px]">
                    <p className="truncate text-[15px] font-medium text-ink">{f.productName}</p>
                    <StockBadge level={f.stockLevel} locale={locale} />
                    {f.isFeatured && (
                      <Star className="h-[12px] w-[12px] shrink-0 fill-ink text-ink xl:hidden" strokeWidth={1.6} />
                    )}
                  </div>
                  <p className="mt-[2px] truncate text-[12px] text-taupe">
                    <span className="xl:hidden">
                      {priceText}
                      {onSale && <span className="ml-[6px] text-terracotta">−{Math.round((1 - price / old) * 100)}%</span>}
                    </span>
                    <span className="hidden xl:inline">{showCategory ? categoryName(f.categoryId) : f.ingredients || "—"}</span>
                  </p>
                </div>

                {/* Mobile: chevron */}
                <ChevronRight className="h-[18px] w-[18px] text-ink/50 xl:hidden" strokeWidth={1.4} />

                {/* Desktop columns */}
                <span className="hidden text-right tabular-nums xl:block">
                  <span className="block text-[14px] font-medium text-ink">{priceText}</span>
                  {onSale && (
                    <span className="block text-[12px] text-taupe">
                      <span className="line-through">{formatMNT(old)}</span>
                      <span className="ml-[6px] text-terracotta">−{Math.round((1 - price / old) * 100)}%</span>
                    </span>
                  )}
                </span>
                <span className="relative z-[2] hidden justify-center xl:flex">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFeatured(f);
                    }}
                    title={f.isFeatured ? t("editor.unfeature") : t("editor.feature")}
                    aria-pressed={f.isFeatured}
                    aria-label={`${f.isFeatured ? t("editor.unfeature") : t("editor.feature")}: ${f.productName}`}
                    disabled={busyFeatured.includes(String(f.id))}
                    className="flex h-[44px] w-[44px] items-center justify-center hover:bg-sand disabled:opacity-40"
                  >
                    <Star
                      className={`h-[16px] w-[16px] ${f.isFeatured ? "fill-ink text-ink" : "text-ink/25"}`}
                      strokeWidth={1.5}
                    />
                  </button>
                </span>
                <span className="hidden justify-end xl:flex">
                  <span className="inline-flex h-[36px] items-center gap-[6px] border border-ink/20 px-[12px] text-[13px] text-ink transition-colors group-hover:border-ink hover:bg-ink hover:text-paper">
                    <Pencil className="h-[13px] w-[13px]" strokeWidth={1.5} />
                    {t("editor.edit")}
                  </span>
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
