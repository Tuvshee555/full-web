import { prisma } from "../utils/prisma.js";
import { STORE, BRAND_COPY, PRODUCT_CONTENT } from "../../src/config/store-data.mjs";
import { deliveryFee } from "../utils/deliveryFee.js";
import { siteUrl } from "../utils/siteUrl.js";

export async function readContext(settings, locale) {
  const products = await prisma.food.findMany({ include: { sizes: { orderBy: { label: "asc" } }, category: true }, orderBy: { createdAt: "desc" } });
  return { products, settings, locale, store: STORE, brand: BRAND_COPY[locale], content: PRODUCT_CONTENT, deliveryFee: deliveryFee(), site: siteUrl() };
}
export function understandingCatalogue(context) {
  return context.products.map((p) => ({ id: p.id, name: p.foodName, description: p.ingredients, category: p.category?.categoryName,
    content: { ...context.content.default, ...context.content[p.id] } }));
}
