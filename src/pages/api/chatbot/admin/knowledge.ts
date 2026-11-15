import { apiRoute } from "../../../../chatbot/api";
import { requireAdminAccess } from "../../../../chatbot/adminAccess";
import { prisma } from "../../../../chatbot/prisma";
import { productFaqItems, productVerification } from "../../../../chatbot/catalogue";
import { PRODUCT_FACT_KEYS } from "../../../../chatbot/productFacts";
import { POLICIES, STORE } from "../../../../config/store-data.mjs";
import { deliveryFee } from "../../../../../server/utils/deliveryFee.js";

export type FactStatus = "verified" | "unverified" | "missing";

/**
 * Per product and per fact: verified (ticked by the owner), unverified (text exists but was never
 * checked; the assistant will not quote it) or missing (nothing entered). Pure, so it is testable.
 */
export function factStatuses(row: { ingredients?: string | null; ingredientList?: string | null; volume?: string | null; howToUse?: string | null; usageFrequency?: string | null; storage?: string | null; safetyNotes?: string | null; image?: string | null; price?: number; sizes: Array<{ label: string; stock: number | null }>; verifiedFacts?: unknown }): Record<string, FactStatus> {
  const verified = productVerification(row.verifiedFacts);
  const has = (value: unknown) => typeof value === "string" ? Boolean(value.trim()) : value != null;
  const volumeFromSize = row.sizes.some((size) => /\d\s*(?:мл|ml|г|g|gr)(?!\p{L})/iu.test(size.label));
  const present: Record<string, boolean> = {
    description: has(row.ingredients), ingredients: has(row.ingredientList), volume: has(row.volume) || volumeFromSize, usage: has(row.howToUse),
    frequency: has(row.usageFrequency), storage: has(row.storage), safety: has(row.safetyNotes), claims: has(row.ingredients),
    photos: has(row.image), price: typeof row.price === "number" && row.price > 0, stock: row.sizes.some((size) => size.stock != null),
  };
  return Object.fromEntries(PRODUCT_FACT_KEYS.map((key) => [key, verified[key] ? "verified" : present[key] ? "unverified" : "missing"]));
}

/** What the assistant knows and what is still missing or unchecked, so the owner can fill the gaps product by product. */
export default apiRoute(async (req, res) => {
  if (!(await requireAdminAccess(req, res, "api.chatbot.admin.knowledge"))) return;
  if (req.method !== "GET") return res.status(405).end();
  const rows = await prisma.product.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, productName: true, ingredients: true, image: true, price: true, volume: true, howToUse: true, ingredientList: true, safetyNotes: true, storage: true, usageFrequency: true, faq: true, verifiedFacts: true, updatedAt: true, createdAt: true, sizes: { select: { label: true, stock: true } } } });
  const products = rows.map((row) => {
    const faq = productFaqItems(row.faq);
    const status = factStatuses(row);
    const facts = { volume: status.volume === "verified", howToUse: status.usage === "verified", ingredientList: status.ingredients === "verified", safetyNotes: status.safety === "verified", faq: faq.length };
    const missing = (["volume", "howToUse", "ingredientList"] as const).filter((key) => !facts[key]);
    const unverified = PRODUCT_FACT_KEYS.filter((key) => status[key] === "unverified");
    return { id: row.id, productName: row.productName, updatedAt: row.updatedAt, createdAt: row.createdAt, facts, status, missing, unverified, faqCount: faq.length };
  });
  return res.json({
    ok: true, products,
    complete: products.filter((product) => product.missing.length === 0).length,
    factKeys: PRODUCT_FACT_KEYS,
    policies: POLICIES, deliveryFee: deliveryFee(),
    store: { contact: STORE.contact, bank: STORE.bank, paymentMethods: ["QPay", "bank"] },
  });
});
