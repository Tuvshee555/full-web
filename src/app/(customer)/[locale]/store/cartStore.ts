/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { create } from "zustand";

type CartItem = {
  foodId: string;
  quantity: number;
  selectedSize: string | null;
  food: any;
};

type CartState = {
  items: CartItem[];

  load: () => void;
  add: (item: CartItem) => void;
  updateQty: (foodId: string, selectedSize: string | null, qty: number) => void;
  remove: (foodId: string, selectedSize: string | null) => void;
  clear: () => void;
};

export const useCart = create<CartState>((set, get) => ({
  items: [],

  // Load from localStorage
  load: () => {
    const raw = localStorage.getItem("cart");
    if (!raw) return;
    const items = JSON.parse(raw);
    set({ items });
  },

  // Add item
  add: (newItem) => {
    const items = get().items.slice(); // create NEW array (important)

    const existIndex = items.findIndex(
      (i) =>
        i.foodId === newItem.foodId && i.selectedSize === newItem.selectedSize
    );

    if (existIndex >= 0) {
      items[existIndex] = {
        ...items[existIndex],
        quantity: items[existIndex].quantity + newItem.quantity,
      };
    } else {
      items.push(newItem);
    }

    localStorage.setItem("cart", JSON.stringify(items));
    set({ items });
  },

  // Update quantity
  updateQty: (foodId, selectedSize, qty) => {
    const items = get().items.map((i) =>
      i.foodId === foodId && i.selectedSize === selectedSize
        ? { ...i, quantity: qty }
        : i
    );

    localStorage.setItem("cart", JSON.stringify(items));
    set({ items });
  },

  // Remove item
  remove: (foodId, selectedSize) => {
    const items = get().items.filter(
      (i) => !(i.foodId === foodId && i.selectedSize === selectedSize)
    );

    localStorage.setItem("cart", JSON.stringify(items));
    set({ items });
  },

  // Clear cart
  clear: () => {
    localStorage.removeItem("cart");
    set({ items: [] });
  },
}));
