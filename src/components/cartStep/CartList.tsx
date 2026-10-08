"use client";

import React from "react";
import { CartItemRow } from "./CartItemRow";
import { useI18n } from "@/components/i18n/ClientI18nProvider";

type CartItem = {
  foodId: string;
  quantity: number;
  selectedSize?: string | null;
  food: {
    id: string;
    foodName: string;
    price: number;
    image: string;
  };
};

type Props = {
  items: CartItem[];
  onUpdateQty: (
    foodId: string,
    qty: number,
    selectedSize?: string | null
  ) => void;
  onRemove: (foodId: string, selectedSize?: string | null) => void;
};

export const CartList: React.FC<Props> = ({ items, onUpdateQty, onRemove }) => {
  const { t } = useI18n();

  if (!items.length) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        {t("cart.empty")}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {items.map((item) => (
        <CartItemRow
          key={`${item.foodId}-${item.selectedSize ?? "default"}`}
          item={item}
          onUpdateQty={(nextQty) =>
            onUpdateQty(item.foodId, nextQty, item.selectedSize)
          }
          onRemove={() => onRemove(item.foodId, item.selectedSize)}
        />
      ))}
    </div>
  );
};
