/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { ownSizePrice, sizeLabel, sizePrice } from "./product";

// Cart lives in localStorage under "cart" (same shape checkout and the order
// API already read). Every write fires "cart-updated"; "cart-open" asks the
// cart drawer to slide in, like Shopify does after "Add to cart".

export type StoreCartItem = {
  productId: string;
  quantity: number;
  selectedSize: string | null;
  product: { id: string; productName: string; price: number; oldPrice?: number | null; image: string };
};

const KEY = "cart";
let memoryCart: StoreCartItem[] = [];

/** Old/corrupted browser data must not crash the storefront or create NaN totals. */
export function normalizeCart(value: unknown): StoreCartItem[] {
  if (!Array.isArray(value)) return [];
  const items = new Map<string, StoreCartItem>();
  for (const row of value.slice(0, 100)) {
    if (!row || typeof row !== "object") continue;
    // Existing devices keep their cart when the catalog terminology changes.
    // Read the former persisted fields here; every returned/written item uses products.
    const productId = row.productId ?? row.foodId;
    const product = row.product ?? row.food;
    const productName = product?.productName ?? product?.foodName;
    if (typeof productId !== "string" || !productId || typeof productName !== "string") continue;
    const quantity = Number(row.quantity);
    const price = Number(product.price);
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 999 || !Number.isFinite(price) || price < 0) continue;
    const size = typeof row.selectedSize === "string" ? row.selectedSize : null;
    const key = JSON.stringify([productId, size]);
    const previous = items.get(key);
    items.set(key, {
      productId,
      selectedSize: size,
      quantity: Math.min(999, quantity + (previous?.quantity ?? 0)),
      product: {
        id: productId,
        productName,
        price,
        image: typeof product.image === "string" ? product.image : "",
        oldPrice: Number.isFinite(product.oldPrice) ? product.oldPrice : null,
      },
    });
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

const same = (a: StoreCartItem, productId: string, size: string | null) =>
  a.productId === productId && (a.selectedSize ?? null) === (size ?? null);

export function addToCart(product: any, quantity = 1, selectedSize: string | null = null, open = true) {
  const items = readCart();
  const i = items.findIndex((c) => same(c, product.id, selectedSize));
  if (i >= 0) {
    items[i] = { ...items[i], quantity: Math.min(999, items[i].quantity + quantity) };
  } else {
    items.push({
      productId: product.id,
      quantity,
      selectedSize,
      product: {
        id: product.id,
        productName: product.productName,
        // unit price of the chosen size; a size with its own price shows no struck-through compare price
        price: sizePrice(product, selectedSize),
        oldPrice: hasOwnPrice(product, selectedSize) ? null : product.oldPrice ?? null,
        image: typeof product.image === "string" ? product.image : "",
      },
    });
  }
  writeCart(items);
  if (open) window.dispatchEvent(new Event("cart-open"));
}

function hasOwnPrice(product: any, selectedSize: string | null) {
  const sizes = Array.isArray(product?.sizes) ? product.sizes : [];
  return ownSizePrice(sizes.find((s: any) => sizeLabel(s) === selectedSize)) !== null;
}

export function setQuantity(productId: string, selectedSize: string | null, quantity: number) {
  const items = readCart();
  writeCart(
    quantity <= 0
      ? items.filter((c) => !same(c, productId, selectedSize))
      : items.map((c) => (same(c, productId, selectedSize) ? { ...c, quantity } : c)),
  );
}

export function clearCart() {
  writeCart([]);
}

export const cartCount = (items: StoreCartItem[]) =>
  items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);

export const cartSubtotal = (items: StoreCartItem[]) =>
  items.reduce((s, i) => s + Number(i.product?.price ?? 0) * (Number(i.quantity) || 0), 0);
