"use client";

import { useI18n } from "@/components/i18n/ClientI18nProvider";
import { ShareButton } from "../ShareButton";

export const FoodTitle = ({
  name,
  price,
  oldPrice,
  url,
}: {
  name: string;
  price: number;
  oldPrice?: number;
  url?: string;
}) => {
  const { t } = useI18n();

  const hasDiscount =
    typeof oldPrice === "number" && !Number.isNaN(oldPrice) && oldPrice > price;

  const savings = hasDiscount ? oldPrice - price : 0;
  const discountPercent = hasDiscount
    ? Math.round((savings / oldPrice!) * 100)
    : 0;

  const fmt = (v: number) =>
    v.toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <div className="w-full mt-3 sm:mt-0 space-y-2">
      {/* title + share */}
      <div className="flex items-start justify-between">
        <h1
          className="
            text-lg sm:text-2xl md:text-3xl
            font-semibold
            tracking-tight
            text-foreground
            leading-snug
          "
        >
          {name}
        </h1>

        {/* share sits top-right (small, non-intrusive) */}
        <div className="ml-4">
          <ShareButton title={name} url={url} />
        </div>
      </div>

      {/* price row */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3 gap-1">
        <div className="flex items-baseline gap-2">
          <span className="text-xl sm:text-2xl md:text-3xl font-semibold text-foreground">
            {fmt(price)}₮
          </span>

          {hasDiscount && (
            <span className="text-sm text-muted-foreground line-through">
              {fmt(oldPrice!)}₮
            </span>
          )}
        </div>

        {/* discount / savings */}
        {hasDiscount && (
          <div className="text-sm text-muted-foreground mt-1 sm:mt-0">
            {t("save")} {fmt(savings)}₮{" "}
            <span className="ml-1 text-muted-foreground/80">
              ({discountPercent}%)
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
