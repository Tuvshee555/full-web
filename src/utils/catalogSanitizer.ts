/* eslint-disable @typescript-eslint/no-explicit-any */

// Each product defines its own sizes or has none. Empty by design: never
// invent variant options by falling back to a universal clothing size chart.
const DEFAULT_CLOTHING_SIZES: string[] = [];

// No hardcoded category renames. Categories render exactly as the admin
// created them (the old Jersey/Accessory fallbacks were fashion-template cruft).
const CATEGORY_FALLBACKS: Record<string, { categoryName: string; imageUrl: string }> = {};

const PRODUCT_IMAGE_PLACEHOLDER = "/product-image-coming-soon.svg";

const normalize = (value?: string | null) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const resolveCategoryFallback = (category: Record<string, any>) => {
  const keys = [
    normalize(category.categoryName),
    normalize(category.id),
    normalize(category.slug),
    normalize(category.categorySlug),
  ];

  for (const key of keys) {
    if (CATEGORY_FALLBACKS[key]) return CATEGORY_FALLBACKS[key];
  }

  return null;
};

export function sanitizeCategory<T extends Record<string, any>>(category: T): T {
  const fallback = resolveCategoryFallback(category);
  if (!fallback) return category;

  return {
    ...category,
    categoryName: fallback.categoryName,
    imageUrl: category.imageUrl || fallback.imageUrl,
  };
}

export function sanitizeCategoryList<T extends Record<string, any>>(
  categories: T[] = []
): T[] {
  return categories.map((category) => sanitizeCategory(category));
}

export function sanitizeProduct<T extends Record<string, any>>(product: T): T {
  const next = { ...product } as Record<string, any>;

  if (next.category && typeof next.category === "object") {
    next.category = sanitizeCategory(next.category);
  }

  // Products without a photo get the placeholder (no per-product name hacks)
  if (!next.image) next.image = PRODUCT_IMAGE_PLACEHOLDER;

  return next as T;
}

export function sanitizeProductList<T extends Record<string, any>>(products: T[] = []): T[] {
  return products.map((product) => sanitizeProduct(product));
}

export function getDefaultClothingSizes() {
  return [...DEFAULT_CLOTHING_SIZES];
}
