import type { CatalogProduct, CatalogueContext, ProductContent } from "./types";
import { isGenericConfirmationText } from "./textNorm";
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
  return new Set([context.deliveryFee, ...products.flatMap((product) => [product.price, ...(product.oldPrice && product.oldPrice > product.price ? [product.oldPrice] : [])])]);
}
