/* eslint-disable @next/next/no-img-element */
"use client";

import { Minus, Plus, X } from "lucide-react";

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
  item: CartItem;
  onUpdateQty: (nextQty: number) => void;
  onRemove: () => void;
};

export const CartItemRow = ({ item, onUpdateQty, onRemove }: Props) => {
  const qty = Math.max(1, Number(item.quantity) || 1);
  const disableMinus = qty <= 1;

  return (
    <div className="relative flex items-center gap-4 pt-2 pl-2 pb-4 border-b border-border">
      {/* REMOVE */}
      <button
        onClick={onRemove}
        aria-label="Remove item"
        className="
    absolute top-0 left-0
    h-[20px] w-[20px]
    flex items-center justify-center
    rounded-full
    bg-black
    text-white
    shadow-sm
  "
      >
        <X size={12} />
      </button>

      {/* IMAGE */}
      <img
        src={item.food.image}
        alt={item.food.foodName}
        className="w-16 h-16 rounded-md object-cover shrink-0"
      />

      {/* INFO */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.food.foodName}</p>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex flex-col items-end gap-2">
        <p className="text-sm font-semibold">
          ₮ {item.food.price.toLocaleString()}
        </p>

        {/* QTY PILL */}
        <div
          className="
            flex items-center
            rounded-md
            border border-border
            bg-card
          "
        >
          <button
            onClick={() => onUpdateQty(qty - 1)}
            disabled={disableMinus}
            className="
              h-9 w-9
              flex items-center justify-center
              text-muted-foreground
              disabled:opacity-40
            "
          >
            <Minus size={14} />
          </button>

          <span
            className="
              h-9 min-w-[36px]
              flex items-center justify-center
              text-sm font-medium
              text-foreground
            "
          >
            {qty}
          </span>

          <button
            onClick={() => onUpdateQty(qty + 1)}
            className="
              h-9 w-9
              flex items-center justify-center
              text-muted-foreground
            "
          >
            <Plus size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
