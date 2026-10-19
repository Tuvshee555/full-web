"use client";

import { create } from "zustand";
import { normalizeCart, readCart, type StoreCartItem } from "@/components/store/lib/cart";

type CartItem = StoreCartItem;

type CartState = {
  items: CartItem[];

  load: () => void;
  add: (item: CartItem) => void;
  updateQty: (productId: string, selectedSize: string | null, qty: number) => void;
  remove: (productId: string, selectedSize: string | null) => void;
  clear: () => void;
};

const persistCart = (value: CartItem[]) => {
  const items = normalizeCart(value);
  localStorage.setItem("cart", JSON.stringify(items));
  return items;
};

export const useCart = create<CartState>((set, get) => ({
  items: [],

  // Load from localStorage
  load: () => {
    set({ items: readCart() });
  },

  // Add item
  add: (newItem) => {
    const items = get().items.slice(); // create NEW array (important)

    const existIndex = items.findIndex(
      (i) =>
        i.productId === newItem.productId && i.selectedSize === newItem.selectedSize
    );

    if (existIndex >= 0) {
      items[existIndex] = {
        ...items[existIndex],
        quantity: items[existIndex].quantity + newItem.quantity,
      };
    } else {
      items.push(newItem);
    }

    set({ items: persistCart(items) });
  },

  // Update quantity
  updateQty: (productId, selectedSize, qty) => {
    const items = get().items.map((i) =>
      i.productId === productId && i.selectedSize === selectedSize
        ? { ...i, quantity: qty }
        : i
    );

    set({ items: persistCart(items) });
  },

  // Remove item
  remove: (productId, selectedSize) => {
    const items = get().items.filter(
      (i) => !(i.productId === productId && i.selectedSize === selectedSize)
    );

    set({ items: persistCart(items) });
  },

  // Clear cart
  clear: () => {
    localStorage.removeItem("cart");
    set({ items: [] });
  },
}));
