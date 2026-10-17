/* eslint-disable @next/next/no-img-element */
"use client";

import { ChevronRight, ImageOff, PackageX, Pencil, Star } from "lucide-react";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { FoodType } from "@admin/type/type";
import { formatMNT } from "@admin/utils/format";
import { StockBadge } from "@/components/store/StockBadge";

type Props = {
  foods: FoodType[];
  categoryName: (id: string) => string;
  showCategory: boolean;
  onEdit: (food: FoodType) => void;
  onToggleFeatured: (food: FoodType) => void;
  emptyText: string;
};

const thumb = (f: FoodType) => (typeof f.image === "string" && f.image.trim() ? f.image : null);

export function ProductList({ foods, categoryName, showCategory, onEdit, onToggleFeatured, emptyText }: Props) {
  const { t, locale } = useI18n();

  if (foods.length === 0) {
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
      <div className="hidden grid-cols-[64px_minmax(0,1fr)_150px_130px_56px_92px] items-center gap-[16px] border-b border-ink/10 px-[16px] py-[10px] text-[11px] font-medium uppercase tracking-[0.12em] text-taupe md:grid">
        <span />
        <span>{t("editor.name")}</span>
        <span>{showCategory ? t("category.title") : ""}</span>
        <span className="text-right">{t("editor.price")}</span>
        <span className="text-center" title={t("food.fields.featured")}>
          <Star className="mx-auto h-[13px] w-[13px]" strokeWidth={1.6} />
        </span>
        <span />
      </div>

      <ul className="divide-y divide-ink/10">
        {foods.map((f) => {
          const img = thumb(f);
          const price = Number(f.price);
          const old = Number(f.oldPrice);
          const onSale = old > price;
          return (
            <li key={String(f.id)}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => onEdit(f)}
                onKeyDown={(e) => (e.key === "Enter" ? onEdit(f) : null)}
                className="grid cursor-pointer grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-[14px] px-[12px] py-[10px] transition-colors hover:bg-paper focus-visible:bg-paper focus-visible:outline-none md:grid-cols-[64px_minmax(0,1fr)_150px_130px_56px_92px] md:gap-[16px] md:px-[16px]"
              >
                <div className="h-[56px] w-[56px] overflow-hidden bg-sand md:h-[64px] md:w-[64px]">
                  {img ? (
                    <img src={img} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-taupe">
                      <ImageOff className="h-[18px] w-[18px]" strokeWidth={1.2} />
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-[8px]">
                    <p className="truncate text-[14px] font-medium text-ink">{f.foodName}</p>
                    <StockBadge level={f.stockLevel} locale={locale} />
                    {f.isFeatured && (
                      <Star className="h-[12px] w-[12px] shrink-0 fill-ink text-ink md:hidden" strokeWidth={1.6} />
                    )}
                  </div>
                  <p className="mt-[2px] truncate text-[12px] text-taupe">
                    <span className="md:hidden">
                      {formatMNT(price)}
                      {onSale && <span className="ml-[6px] text-terracotta">−{Math.round((1 - price / old) * 100)}%</span>}
                    </span>
                    <span className="hidden md:inline">{f.ingredients || "—"}</span>
                  </p>
                </div>

                {/* Mobile: chevron */}
                <ChevronRight className="h-[18px] w-[18px] text-ink/50 md:hidden" strokeWidth={1.4} />

                {/* Desktop columns */}
                <span className="hidden truncate text-[13px] text-taupe md:block">
                  {showCategory ? categoryName(f.categoryId) : ""}
                </span>
                <span className="hidden text-right tabular-nums md:block">
                  <span className="block text-[14px] font-medium text-ink">{formatMNT(price)}</span>
                  {onSale && (
                    <span className="block text-[12px] text-taupe">
                      <span className="line-through">{formatMNT(old)}</span>
                      <span className="ml-[6px] text-terracotta">−{Math.round((1 - price / old) * 100)}%</span>
                    </span>
                  )}
                </span>
                <span className="hidden justify-center md:flex">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFeatured(f);
                    }}
                    title={f.isFeatured ? t("editor.unfeature") : t("editor.feature")}
                    aria-pressed={f.isFeatured}
                    className="flex h-[36px] w-[36px] items-center justify-center hover:bg-sand"
                  >
                    <Star
                      className={`h-[16px] w-[16px] ${f.isFeatured ? "fill-ink text-ink" : "text-ink/25"}`}
                      strokeWidth={1.5}
                    />
                  </button>
                </span>
                <span className="hidden justify-end md:flex">
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
