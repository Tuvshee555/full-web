/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

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

export function readCart(): StoreCartItem[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCart(items: StoreCartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("cart-updated"));
}

const same = (a: StoreCartItem, foodId: string, size: string | null) =>
  a.foodId === foodId && (a.selectedSize ?? null) === (size ?? null);

export function addToCart(food: any, quantity = 1, selectedSize: string | null = null, open = true) {
  const items = readCart();
  const i = items.findIndex((c) => same(c, food.id, selectedSize));
  if (i >= 0) {
    items[i] = { ...items[i], quantity: items[i].quantity + quantity };
  } else {
    items.push({
      foodId: food.id,
      quantity,
      selectedSize,
      food: {
        id: food.id,
        foodName: food.foodName,
        price: Number(food.price ?? 0),
        oldPrice: food.oldPrice ?? null,
        image: typeof food.image === "string" ? food.image : "",
      },
    });
  }
  writeCart(items);
  if (open) window.dispatchEvent(new Event("cart-open"));
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
