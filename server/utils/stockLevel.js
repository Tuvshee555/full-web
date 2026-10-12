/** Pure inventory policy shared by API, storefront, admin and chatbot. */
export function stockLevel(size, threshold = 5) {
  if (size?.stock === undefined && size?.stockLevel) return size.stockLevel;
  if (size?.stock == null) return "untracked";
  if (size.stock <= 0) return "soldout";
  return size.stock <= threshold ? "low" : "available";
}

export function productStockLevel(sizes = [], threshold = 5) {
  if (!sizes.length) return "untracked";
  const levels = sizes.map((s) => stockLevel(s, threshold));
  if (levels.every((s) => s === "soldout")) return "soldout";
  if (levels.every((s) => s === "low" || s === "soldout")) return "low";
  return "untracked";
}

export function stockLabel(level, locale = "mn") {
  const labels = locale === "en"
    ? { low: "Almost gone", soldout: "Sold out", available: "Available", untracked: "" }
    : { low: "Дуусаж байна", soldout: "Дууссан", available: "Бэлэн", untracked: "" };
  return labels[level] || "";
}

export function publicInventory(product, settings, admin = false) {
  const threshold = settings.lowStockThreshold;
  return {
    ...product,
    stockLevel: productStockLevel(product.sizes, threshold),
    sizes: (product.sizes || []).map((size) => ({
      ...size,
      stock: admin || settings.showExactStock || size.stock == null || size.stock === 0 ? size.stock : undefined,
      stockLevel: stockLevel(size, threshold),
    })),
  };
}
