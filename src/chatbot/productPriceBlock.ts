/** The ONE place product prices and per-variant stock become customer text, ported from the canonical fare writer. */
import { productStockLevel, stockLevel, stockLabel } from "../../server/utils/stockLevel.js";
import type { CatalogProduct, CatalogueContext, ProductVariant } from "./types";
export function money(value: number): string { return `${value.toLocaleString("en-US")}₮`; }
export function productLink(product: CatalogProduct, context: CatalogueContext): string { return `${context.site}/${context.locale}/products/${encodeURIComponent(product.id)}`; }
export function formatVariantLine(variant: ProductVariant, context: CatalogueContext): string {
  const label = stockLabel(stockLevel(variant, context.settings.lowStockThreshold), context.locale);
  const exact = context.settings.showExactStock && variant.stock !== null ? (context.locale === "en" ? ` (${variant.stock} remaining)` : ` (${variant.stock} үлдсэн)`) : "";
  return variant.label + (label ? ` — ${label}${exact}` : "");
}
export function formatProductLine(product: CatalogProduct, context: CatalogueContext, options: { showStock?: boolean; showDiscount?: boolean; link?: boolean } = {}): string {
  const label = options.showStock ? stockLabel(productStockLevel(product.sizes, context.settings.lowStockThreshold), context.locale) : "";
  const original = options.showDiscount && product.oldPrice && product.oldPrice > product.price ? (context.locale === "en" ? ` (was ${money(product.oldPrice)})` : ` (үндсэн үнэ ${money(product.oldPrice)})`) : "";
  return `${product.foodName} — ${money(product.price)}${original}${label ? ` · ${label}` : ""}${options.link === false ? "" : `\n${productLink(product, context)}`}`;
}
/** The verifier reads the same writer's canonical price/stock fragments, never its own interpretation. */
export function productEvidenceLines(product: CatalogProduct, context: CatalogueContext): string[] {
  return [formatProductLine(product, context, { showStock: true, showDiscount: true }), ...product.sizes.map((variant) => formatVariantLine(variant, context))].flatMap((line) => line.split("\n"));
}
