import type { CatalogueContext, CatalogProduct, Locale, BotSettings, ProductContent, ProductFaqItem, ShopFaqItem } from "./types";
import { STORE, BRAND_COPY, PRODUCT_CONTENT, POLICIES } from "../config/store-data.mjs";
import { deliveryFee } from "../../server/utils/deliveryFee.js";
import { siteUrl } from "../../server/utils/siteUrl.js";
import { verifiedFacts } from "./productFacts";

type ProductRow = Omit<CatalogProduct, "faq" | "verifiedFacts"> & { faq?: unknown; verifiedFacts?: unknown };

/** The product's FAQ column as stored (JSON); anything malformed is ignored rather than shown. */
export function productFaqItems(value: unknown): ProductFaqItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is { q: string; a: string } => Boolean(item) && typeof item === "object" && typeof (item as { q?: unknown }).q === "string" && typeof (item as { a?: unknown }).a === "string")
    .map((item) => ({ q: item.q.trim(), a: item.a.trim() }))
    .filter((item) => item.q && item.a)
    .slice(0, 30);
}

/** The verification map as stored ({ fact: ISO date }); anything malformed is ignored. */
export function productVerification(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([, date]) => typeof date === "string" && date.trim()).map(([key, date]) => [key, String(date)]));
}

export function normalizeCatalogProduct(row: ProductRow): CatalogProduct {
  return { ...row, faq: productFaqItems(row.faq), verifiedFacts: productVerification(row.verifiedFacts) };
}

/** Steps as the owner typed them: one per line, numbering removed. */
export function howToSteps(text: string | null | undefined): string[] {
  return (text || "").split(/\r?\n/).map((line) => line.replace(/^\s*(?:\d+[.)]|[-•*])\s*/, "").trim()).filter(Boolean).slice(0, 12);
}

/**
 * What the assistant may quote about a product: the database fields the owner has VERIFIED (the
 * product page may still show unverified text; the assistant never repeats it), the owner's own
 * FAQ answers, and the config file as a fallback. The description's claims need both "description"
 * and "claims" ticked before the writer may use them.
 */
export function productKnowledge(product: CatalogProduct): ProductContent {
  const configured: ProductContent = { ...PRODUCT_CONTENT.default, ...(PRODUCT_CONTENT as Record<string, ProductContent>)[product.id] };
  const verified = verifiedFacts(product);
  const steps = howToSteps(product.howToUse);
  return {
    ...configured,
    ...(steps.length && verified.has("usage") ? { howTo: steps } : {}),
    ...(product.ingredientList?.trim() && verified.has("ingredients") ? { fullIngredients: product.ingredientList.trim() } : {}),
    ...(product.usageFrequency?.trim() && verified.has("frequency") ? { frequency: product.usageFrequency.trim() } : {}),
    ...(product.storage?.trim() && verified.has("storage") ? { storage: product.storage.trim() } : {}),
    ...(product.safetyNotes?.trim() && verified.has("safety") ? { safety: product.safetyNotes.trim() } : {}),
    ...(product.ingredients?.trim() && verified.has("description") && verified.has("claims") ? { description: product.ingredients.trim().replace(/\s+/g, " ").slice(0, 600) } : {}),
    ...(product.faq?.length ? { faq: product.faq } : {}),
  };
}

export function buildContext(input: {
  products: CatalogProduct[]; settings: BotSettings; locale: Locale; shopFaq: ShopFaqItem[];
  deliveryFee: number; site: string;
}): CatalogueContext {
  const { locale } = input;
  const content: Record<string, ProductContent> = { default: { ...PRODUCT_CONTENT.default } };
  for (const product of input.products) content[product.id] = productKnowledge(product);
  const brand = BRAND_COPY[locale];
  return {
    products: input.products, settings: input.settings, locale,
    store: { name: STORE.name, contact: STORE.contact, bank: STORE.bank },
    brand: { about: brand.about, faq: [...brand.faq, ...input.shopFaq] },
    policies: POLICIES[locale],
    content, deliveryFee: input.deliveryFee, site: input.site,
  };
}

/** The shop FAQ rows the owner edits, in the customer's language (English falls back to Mongolian). */
export function shopFaqFor(rows: Array<{ question: string; answer: string; questionEn?: string | null; answerEn?: string | null }>, locale: Locale): ShopFaqItem[] {
  return rows.map((row) => (locale === "en" && row.questionEn?.trim() ? { q: row.questionEn.trim(), a: (row.answerEn || row.answer).trim() } : { q: row.question.trim(), a: row.answer.trim() })).filter((item) => item.q && item.a);
}

export async function readContext(settings: BotSettings, locale: Locale): Promise<CatalogueContext> {
  const { prisma } = await import("./prisma");
  const [rows, faqRows] = await Promise.all([
    prisma.product.findMany({ include: { sizes: { orderBy: { label: "asc" } }, category: true }, orderBy: { createdAt: "desc" } }),
    prisma.chatFaq.findMany({ where: { enabled: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], take: 100 }).catch(() => []),
  ]);
  return buildContext({ products: rows.map((row) => normalizeCatalogProduct(row as ProductRow)), settings, locale, shopFaq: shopFaqFor(faqRows, locale), deliveryFee: deliveryFee(), site: siteUrl() });
}

export function understandingCatalogue(context: CatalogueContext) {
  return context.products.map((p) => ({ id: p.id, name: p.productName, description: p.ingredients, category: p.category?.categoryName,
    content: { ...context.content.default, ...context.content[p.id] } }));
}
