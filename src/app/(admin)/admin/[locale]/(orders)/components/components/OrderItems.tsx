/* eslint-disable @next/next/no-img-element */
"use client";

import { FoodItem, PLACEHOLDER } from "../type";

type Props = {
  items?: FoodItem[];
  orderId: string;
  t: (key: string) => string;
};

export function OrderItems({ items = [], orderId, t }: Props) {
  const total = items.reduce((sum, it) => {
    return sum + (it.food?.price ?? 0) * it.quantity;
  }, 0);

  if (items.length === 0) {
    return <div className="text-sm text-foreground">{t("no_items")}</div>;
  }

  return (
    <div className="bg-background border border-border rounded-lg">
      {/* Items */}
      <div className="divide-y divide-border">
        {items.map((it, i) => {
          const food = it.food;
          const price = food?.price ?? 0;
          const qty = it.quantity;
          const subtotal = price * qty;

          return (
            <div
              key={`${orderId}-${i}-${food?.id ?? "nofood"}`}
              className="px-4 py-3 flex items-center gap-4"
            >
              {/* Image */}
              <img
                src={food?.image ?? PLACEHOLDER}
                alt={food?.foodName ?? "food"}
                onError={(e) => {
                  e.currentTarget.src = PLACEHOLDER;
                }}
                className="w-12 h-12 rounded-md object-cover flex-shrink-0"
              />

              {/* Name + meta */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">
                  {food?.foodName ?? "(no name)"}
                </div>

                <div className="text-xs text-foreground">
                  ID: {food?.id ?? "-"} • {t("category.title")}:{" "}
                  {food?.categoryId ?? "-"}
                </div>
              </div>

              {/* Price */}
              <div className="text-right text-sm text-foreground">
                <div>
                  {t("unit_price")}: ₮{price.toLocaleString()}
                </div>
                <div>
                  {t("quantity")}: ×{qty}
                </div>
                <div className="font-semibold mt-1">
                  {t("subtotal")}: ₮{subtotal.toLocaleString()}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div className="flex justify-between px-4 py-3 border-t border-border">
        <div className="text-sm font-semibold text-foreground">
          {t("subtotal")}
        </div>
        <div className="text-sm font-semibold text-foreground">
          ₮{total.toLocaleString()}
        </div>
      </div>
    </div>
  );
}
