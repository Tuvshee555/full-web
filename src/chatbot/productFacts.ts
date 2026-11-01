import type { CatalogProduct, CatalogueContext, ProductContent, ProductFactKey } from "./types";
import { isGenericConfirmationText } from "./textNorm";
import { productPrices } from "./productPriceBlock";

/** Every fact the owner can mark as checked against the real product (admin → product → Verification). */
export const PRODUCT_FACT_KEYS: readonly ProductFactKey[] = ["description", "ingredients", "volume", "usage", "frequency", "storage", "safety", "claims", "photos", "price", "stock"];

/** The facts the owner has verified, as a set; malformed data counts as nothing verified. */
export function verifiedFacts(product: Pick<CatalogProduct, "verifiedFacts">): Set<ProductFactKey> {
  const raw = product.verifiedFacts;
  const keys = new Set<ProductFactKey>();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return keys;
  for (const key of PRODUCT_FACT_KEYS) {
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim()) keys.add(key);
  }
  return keys;
}

/** The published volume, only once the owner verified it; the size labels ("5 мл") are catalogue data and always usable. */
export function verifiedVolume(product: CatalogProduct): string | null {
  return product.volume?.trim() && verifiedFacts(product).has("volume") ? product.volume.trim() : null;
}

export function unsafeClaim(text: string | null | undefined): boolean {
  return /(?:100\s*%|баталгаатай.{0,30}(?:ург|үр\s*дүн)|\bguarantee(?:d)?\b.{0,30}(?:grow|result)|regrow|ург(?:уул|ана|ах).{0,30}(?:хоног|өдөр|долоо\s*хоног)|(?:эмчилнэ|cures?|treats?\s+disease))/iu.test(text || "");
}
export function safeProductText(text: string | null | undefined, locale = "mn"): text is string {
  return Boolean(text?.trim()) && !isGenericConfirmationText(text) && !unsafeClaim(text)
    && (locale !== "en" || !/[а-яөүё]/iu.test(text || ""))
    && !/₮|\bMNT\b|\b(?:stock|discount|price)\b|нөөц|хямдрал|үнэ/iu.test(text || "");
}
export function contentOf(product: CatalogProduct, context: CatalogueContext): ProductContent {
  return { ...context.content.default, ...context.content[product.id] };
}
export function quotablePrices(products: CatalogProduct[], context: CatalogueContext): Set<number> {
  return new Set([context.deliveryFee, ...products.flatMap((product) => [...productPrices(product), product.price, ...(product.oldPrice && product.oldPrice > product.price ? [product.oldPrice] : [])])]);
}
