"use client";

import { useEffect, useState, useCallback } from "react";
import { SheetFooter } from "@/components/ui/sheet";
import { CartItemRow } from "./CartItemRow";
import { CartSummary } from "./CartSummary";
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

const CART_KEY = "cart";

export const PayFood = () => {
  const { t } = useI18n();

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  /* ---------------- LOAD CART ---------------- */

  const loadCart = useCallback(() => {
    try {
      const raw = localStorage.getItem(CART_KEY) || "[]";
      const parsed = JSON.parse(raw);
      setCartItems(Array.isArray(parsed) ? parsed : []);
    } catch {
      setCartItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCart();

    const handler = () => loadCart();
    window.addEventListener("cart-updated", handler);
    return () => window.removeEventListener("cart-updated", handler);
  }, [loadCart]);

  /* ---------------- PERSIST ---------------- */

  const persist = (next: CartItem[]) => {
    setCartItems(next);
    localStorage.setItem(CART_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("cart-updated"));
  };

  /* ---------------- UPDATE QTY ---------------- */

  const updateQuantity = useCallback(
    (nextQty: number, item: CartItem) => {
      const qty = Math.max(1, nextQty);
      const next = cartItems.map((i) =>
        i.foodId === item.foodId && i.selectedSize === item.selectedSize
          ? { ...i, quantity: qty }
          : i
      );
      persist(next);
    },
    [cartItems]
  );

  /* ---------------- REMOVE ---------------- */

  const removeItem = useCallback(
    (item: CartItem) => {
      const next = cartItems.filter(
        (i) =>
          !(i.foodId === item.foodId && i.selectedSize === item.selectedSize)
      );
      persist(next);
    },
    [cartItems]
  );

  /* ---------------- CLEAR ---------------- */

  const clearAll = () => {
    persist([]);
  };

  /* ---------------- TOTAL ---------------- */

  const totalPrice = cartItems.reduce(
    (sum, i) => sum + i.food.price * i.quantity,
    0
  );

  /* ---------------- RENDER ---------------- */

  return (
    <div className="flex flex-col h-full">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold text-foreground">
          {t("your_cart")}
        </h1>

        {!loading && cartItems.length > 0 && (
          <button
            onClick={clearAll}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {t("clear_cart")}
          </button>
        )}
      </div>

      {/* ITEMS — SCROLLABLE */}
      <div className="flex-1 overflow-y-auto space-y-5">
        {loading ? (
          <p className="text-center py-10 text-muted-foreground">
            {t("loading")}
          </p>
        ) : cartItems.length > 0 ? (
          cartItems.map((item) => (
            <CartItemRow
              key={`${item.foodId}-${item.selectedSize ?? "default"}`}
              item={item}
              onUpdateQty={(qty) => updateQuantity(qty, item)}
              onRemove={() => removeItem(item)}
            />
          ))
        ) : (
          <p className="text-center py-10 text-muted-foreground">
            {t("cart_empty")}
          </p>
        )}
      </div>

      {/* SUMMARY — BOTTOM ACTION */}
      {!loading && cartItems.length > 0 && (
        <div className="pt-4 border-t border-border">
          <CartSummary total={totalPrice} />
        </div>
      )}

      <SheetFooter />
    </div>
  );
};
