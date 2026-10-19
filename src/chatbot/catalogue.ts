import type { CatalogueContext, Locale, BotSettings } from "./types";
import { STORE, BRAND_COPY, PRODUCT_CONTENT } from "../config/store-data.mjs";
import { deliveryFee } from "../../server/utils/deliveryFee.js";
import { siteUrl } from "../../server/utils/siteUrl.js";

export async function readContext(settings: BotSettings, locale: Locale): Promise<CatalogueContext> {
  const { prisma } = await import("./prisma");
  const products = await prisma.product.findMany({ include: { sizes: { orderBy: { label: "asc" } }, category: true }, orderBy: { createdAt: "desc" } });
  return { products, settings, locale, store: STORE, brand: BRAND_COPY[locale], content: PRODUCT_CONTENT, deliveryFee: deliveryFee(), site: siteUrl() };
}
export function understandingCatalogue(context: CatalogueContext) {
  return context.products.map((p) => ({ id: p.id, name: p.productName, description: p.ingredients, category: p.category?.categoryName,
    content: { ...context.content.default, ...context.content[p.id] } }));
}
