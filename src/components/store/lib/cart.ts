/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { ownSizePrice, sizeLabel, sizePrice } from "./product";

// Cart lives in localStorage under "cart" (same shape checkout and the order
// API already read). Every write fires "cart-updated"; "cart-open" asks the
// cart drawer to slide in, like Shopify does after "Add to cart".

export type StoreCartItem = {
  foodId: string;
  quantity: number;
  selectedSize: string | null;
  food: { id: string; foodName: string; price: number; oldPrice?: number | null; image: string };
};

const KEY = "cart";
let memoryCart: StoreCartItem[] = [];

/** Old/corrupted browser data must not crash the storefront or create NaN totals. */
export function normalizeCart(value: unknown): StoreCartItem[] {
  if (!Array.isArray(value)) return [];
  const items = new Map<string, StoreCartItem>();
  for (const row of value.slice(0, 100)) {
    if (!row || typeof row.foodId !== "string" || !row.foodId || !row.food || typeof row.food.foodName !== "string") continue;
    const quantity = Number(row.quantity);
    const price = Number(row.food.price);
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 999 || !Number.isFinite(price) || price < 0) continue;
    const size = typeof row.selectedSize === "string" ? row.selectedSize : null;
    const key = JSON.stringify([row.foodId, size]);
    const previous = items.get(key);
    items.set(key, { foodId: row.foodId, selectedSize: size, quantity: Math.min(999, quantity + (previous?.quantity ?? 0)), food: { id: row.foodId, foodName: row.food.foodName, price, image: typeof row.food.image === "string" ? row.food.image : "", oldPrice: Number.isFinite(row.food.oldPrice) ? row.food.oldPrice : null } });
  }
  return Array.from(items.values());
}

export function readCart(): StoreCartItem[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
    return normalizeCart(parsed);
  } catch {
    return memoryCart;
  }
}

function writeCart(items: StoreCartItem[]) {
  memoryCart = normalizeCart(items);
  try { localStorage.setItem(KEY, JSON.stringify(memoryCart)); } catch { /* Storage-restricted browsers retain a session cart. */ }
  window.dispatchEvent(new Event("cart-updated"));
}

const same = (a: StoreCartItem, foodId: string, size: string | null) =>
  a.foodId === foodId && (a.selectedSize ?? null) === (size ?? null);

export function addToCart(food: any, quantity = 1, selectedSize: string | null = null, open = true) {
  const items = readCart();
  const i = items.findIndex((c) => same(c, food.id, selectedSize));
  if (i >= 0) {
    items[i] = { ...items[i], quantity: Math.min(999, items[i].quantity + quantity) };
  } else {
    items.push({
      foodId: food.id,
      quantity,
      selectedSize,
      food: {
        id: food.id,
        foodName: food.foodName,
        // unit price of the chosen size; a size with its own price shows no struck-through compare price
        price: sizePrice(food, selectedSize),
        oldPrice: hasOwnPrice(food, selectedSize) ? null : food.oldPrice ?? null,
        image: typeof food.image === "string" ? food.image : "",
      },
    });
  }
  writeCart(items);
  if (open) window.dispatchEvent(new Event("cart-open"));
}

function hasOwnPrice(food: any, selectedSize: string | null) {
  const sizes = Array.isArray(food?.sizes) ? food.sizes : [];
  return ownSizePrice(sizes.find((s: any) => sizeLabel(s) === selectedSize)) !== null;
}

export function setQuantity(foodId: string, selectedSize: string | null, quantity: number) {
  const items = readCart();
  writeCart(
    quantity <= 0
      ? items.filter((c) => !same(c, foodId, selectedSize))
      : items.map((c) => (same(c, foodId, selectedSize) ? { ...c, quantity } : c)),
  );
}

export function clearCart() {
  writeCart([]);
}

export const cartCount = (items: StoreCartItem[]) =>
  items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);

export const cartSubtotal = (items: StoreCartItem[]) =>
  items.reduce((s, i) => s + Number(i.food?.price ?? 0) * (Number(i.quantity) || 0), 0);
