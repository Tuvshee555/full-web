"use client";

import Image from "next/image";
import { ShoppingBag } from "lucide-react";
import { OrderItem } from "./types";
import { useI18n } from "@/components/i18n/ClientI18nProvider";

export const ItemsList = ({ items }: { items: OrderItem[] }) => {
  const { t } = useI18n();

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <h3 className="font-semibold mb-5 flex items-center gap-2">
        <ShoppingBag className="w-4 h-4 text-primary" />
        {t("ordered_foods")}
      </h3>

      <div className="space-y-3">
        {items.map((item) => {
          const price = item.food.price ?? 0;
          const total = price * item.quantity;

          return (
            <div key={item.id} className="flex items-center gap-4 py-3 border-b border-border last:border-0">
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted shrink-0 border border-border relative">
                {item.food.image ? (
                  <Image
                    src={item.food.image}
                    alt={item.food.foodName}
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                    —
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{item.food.foodName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {price.toLocaleString()}₮ × {item.quantity}
                </p>
              </div>

              <p className="font-bold text-sm shrink-0">{total.toLocaleString()}₮</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
