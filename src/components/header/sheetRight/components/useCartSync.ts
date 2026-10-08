"use client";

import { useState, useEffect, useCallback } from "react";

type CartItem = {
  id?: string;
  foodId?: string;
  quantity?: number | string | unknown;
  [key: string]: unknown;
};

const normalizeQuantity = (val: unknown): number => {
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (typeof val === "string") {
    const n = Number(val);
    if (!Number.isNaN(n) && Number.isFinite(n)) return n;
  }
  return 1;
};

export const useCartSync = (): number => {
  const [cartCount, setCartCount] = useState<number>(0);

  const loadLocalCartCount = useCallback(() => {
    const raw = localStorage.getItem("cart") || "[]";
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        setCartCount(0);
        return;
      }

      const qty = parsed.reduce(
        (sum: number, item: CartItem) => sum + normalizeQuantity(item?.quantity),
        0
      );
      setCartCount(qty);
    } catch {
      setCartCount(0);
    }
  }, []);

  useEffect(() => {
    loadLocalCartCount();

    const onCustom = () => loadLocalCartCount();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "cart") loadLocalCartCount();
    };

    window.addEventListener("cart-updated", onCustom);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("cart-updated", onCustom);
      window.removeEventListener("storage", onStorage);
    };
  }, [loadLocalCartCount]);

  return cartCount;
};
