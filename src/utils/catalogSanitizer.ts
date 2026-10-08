/* eslint-disable @typescript-eslint/no-explicit-any */

// Food has no universal size chart — a dish either defines its own sizes
// (e.g. "Дунд", "Том") or has none. Empty by design: never fall back to
// leftover clothing sizes (XS–4XL) on a food menu.
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

export function sanitizeFood<T extends Record<string, any>>(food: T): T {
  const next = { ...food } as Record<string, any>;

  if (next.category && typeof next.category === "object") {
    next.category = sanitizeCategory(next.category);
  }

  const productName = normalize(next.foodName);
  const isNomadEdgeJersey =
    productName === "nomad edge pro jersey" ||
    productName === "номад эдж про жерси" ||
    (productName.includes("nomad edge") && productName.includes("jersey")) ||
    (productName.includes("номад") && productName.includes("жерси"));
  if (isNomadEdgeJersey) {
    next.image = PRODUCT_IMAGE_PLACEHOLDER;
  }

  if (isNomadEdgeJersey) {
    next.extraImages = [PRODUCT_IMAGE_PLACEHOLDER];
  }

  return next as T;
}

export function sanitizeFoodList<T extends Record<string, any>>(foods: T[] = []): T[] {
  return foods.map((food) => sanitizeFood(food));
}

export function getDefaultClothingSizes() {
  return [...DEFAULT_CLOTHING_SIZES];
}
