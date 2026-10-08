"use client";

import { useEffect, useState } from "react";
import { readCart, type StoreCartItem } from "./cart";

/** Live view of the localStorage cart (updates on any add/remove, any tab). */
export function useStoreCart() {
  const [items, setItems] = useState<StoreCartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const load = () => setItems(readCart());
    load();
    setReady(true);
    const onStorage = (e: StorageEvent) => e.key === "cart" && load();
    window.addEventListener("cart-updated", load);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("cart-updated", load);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return { items, ready };
}
