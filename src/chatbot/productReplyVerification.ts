import type { CatalogProduct, CatalogueContext } from "./types";
import type { ProductSelection } from "./productRequest";
import { productEvidenceLines, productLink } from "./productPriceBlock";
import { quotablePrices, unsafeClaim } from "./productFacts";
import { isReferReply } from "./reply";
const AMOUNT = /(\d{1,3}(?:[.,]\d{3})+|\d+)\s*(?:₮|төгрөг|MNT)(?![\p{L}])/giu;
const STOCK = /(?:Дуусаж байна|Дууссан|Бэлэн|Almost gone|Sold out|Available)/giu;
const PROSE_STOCK = /(?:Дуусаж байна|Дууссан|Almost gone|Sold out)/giu;
const normalized = (text: string) => text.toLowerCase().replace(/[•*]/g, "").replace(/\s+/g, " ").trim();

/** Source final shared deterministic check: verify amounts, names, variant claims and policy using canonical evidence. */
export function verifyProductReply(input: {
  reply: string; products: CatalogProduct[]; context: CatalogueContext; selection?: ProductSelection | null;
  approvedReply?: string;
}): string {
  const { reply, products, context } = input;
  if (!reply.trim() || isReferReply(reply) || unsafeClaim(reply)) return "REFER";
  const prices = quotablePrices(products, context);
  let active = products;
  for (const line of reply.split(/\r?\n/)) {
    const named = products.filter((product) => line.includes(product.foodName));
    if (named.length) active = named;
    for (const match of line.matchAll(AMOUNT)) {
      const amount = Number(match[1].replace(/[.,]/g, ""));
      if (!prices.has(amount)) return "REFER";
      if (named.length && !named.some((product) => product.price === amount || product.oldPrice === amount)) return "REFER";
    }
    const variant = active.flatMap((product) => product.sizes).filter((size) => line.includes(size.label));
    for (const match of line.matchAll(STOCK)) {
      const text = normalized(match[0]);
      const evidence = active.flatMap((product) => productEvidenceLines(product, context));
      if (!evidence.some((entry) => normalized(entry).includes(text) && (!variant.length || variant.some((size) => entry.includes(size.label))))) return "REFER";
    }
  }
  const links = [...reply.matchAll(/https?:\/\/[^\s)]+/gu)].map((match) => match[0]);
  const allowedLinks = new Set((input.approvedReply || "").match(/https?:\/\/[^\s)]+/gu) || []);
  if (links.some((link) => !allowedLinks.has(link))) return "REFER";
  // All factual clauses are grounded in the same approved plan. Provider wording may reorder lines,
  // but cannot add claims that this code-only checker cannot establish (ingredients, promises, policy).
  if (input.approvedReply) {
    const approved = new Set(input.approvedReply.split(/\n/).filter((line) => line.trim()).map(normalized));
    const harmless = /^(?:hello!?|hi!?|сайн байна уу[.!]?|thank you[.!]?|баярлалаа[.!]?|here are the details:?)$/iu;
    const lines = reply.split(/\n/).filter((line) => line.trim());
    if (lines.some((line) => !approved.has(normalized(line)) && !harmless.test(line.trim()))) return "REFER";
    // Dropping a selected variant's stock warning or the requested detail is also a failed verification.
    const required = [...approved].filter((line) => /₮|https?:|sold out|almost gone|дууссан|дуусаж байна|order status|захиалгын төлөв/i.test(line));
    const shown = new Set(lines.map(normalized));
    if (required.some((line) => !shown.has(line))) return "REFER";
  } else {
    // Without an approved answer, only complete canonical product lines are safe.
    const evidence = new Set(products.flatMap((product) => productEvidenceLines(product, context)).map(normalized));
    if (reply.split(/\n/).filter((line) => line.trim()).some((line) => !evidence.has(normalized(line)))) return "REFER";
  }
  return reply;
}

/**
 * Check for model-written prose (Uudam's layer-2 output guards, product edition). Unlike
 * verifyProductReply it allows free wording, but every checkable fact must match the evidence:
 * amounts, links, stock labels, phone numbers and health claims. The reason is logged on rejection.
 */
export function explainFreeformReply(reply: string, context: CatalogueContext, customerText = ""): { ok: true; text: string } | { ok: false; reason: string } {
  const text = reply.trim();
  if (!text || isReferReply(text)) return { ok: false, reason: "refer" };
  if (unsafeClaim(text)) return { ok: false, reason: "health_claim" };
  const prices = quotablePrices(context.products, context);
  // Links are checked as whole URLs below; product ids inside them are not numbers or phones.
  const withoutLinks = text.replace(/https?:\/\/[^\s)]+/gu, " ");
  for (const line of withoutLinks.split(/\r?\n/)) {
    const named = context.products.filter((product) => line.includes(product.foodName));
    for (const match of line.matchAll(AMOUNT)) {
      const amount = Number(match[1].replace(/[.,]/g, ""));
      if (!prices.has(amount)) return { ok: false, reason: `unknown_amount:${amount}` };
      // Uudam's wrong-trip guard: a line naming one product may not quote another product's price.
      if (named.length === 1 && amount !== context.deliveryFee && named[0].price !== amount && named[0].oldPrice !== amount) return { ok: false, reason: `other_products_price:${amount}` };
    }
    // Prose only claims scarcity with these labels; "available" is ordinary English ("more options are available").
    for (const match of line.matchAll(PROSE_STOCK)) {
      const label = normalized(match[0]);
      const pool = named.length ? named : context.products;
      const evidence = pool.flatMap((product) => productEvidenceLines(product, context)).map(normalized);
      const variants = pool.flatMap((product) => product.sizes).filter((size) => line.includes(size.label));
      if (!evidence.some((entry) => entry.includes(label) && (!variants.length || variants.some((size) => entry.includes(normalized(size.label)))))) return { ok: false, reason: `stock_label:${label}` };
    }
  }
  const allowed = new Set([
    ...context.products.map((product) => productLink(product, context)),
    `${context.site}/${context.locale}/cart`, `${context.site}/${context.locale}/checkout`, `${context.site}/${context.locale}`, context.site,
  ]);
  for (const match of text.matchAll(/https?:\/\/[^\s)]+/gu)) if (!allowed.has(match[0].replace(/[.,!?;:]+$/, ""))) return { ok: false, reason: "unknown_link" };
  // Uudam lesson (2026-10-06): a made-up office phone/address reached real customers.
  const allowedPhones = new Set([context.store.contact.phone, ...(customerText.match(/\d{8}/g) || [])].filter(Boolean).map((phone) => String(phone).replace(/\D/g, "").slice(-8)));
  for (const match of withoutLinks.matchAll(/(?<![\d-])(?:\+?976[ -]?)?(\d{4}[ -]?\d{4})(?![\d-])/g)) if (!allowedPhones.has(match[1].replace(/\D/g, ""))) return { ok: false, reason: "unknown_phone" };
  for (const match of withoutLinks.matchAll(/[\w.+-]+@[\w-]+\.[\w.]+/g)) if (match[0].replace(/\.+$/, "") !== context.store.contact.email) return { ok: false, reason: "unknown_email" };
  // Never claim cards work or that a payment was received.
  if (/(?:картаар\s+(?:төлөх\s+)?(?:боломжтой|болно)|(?:can|may)\s+pay\s+(?:by|with)\s+(?:a\s+)?card|төлбөр\s+(?:орсон|баталгаажсан)|payment\s+(?:is\s+)?(?:received|confirmed))/iu.test(text)) return { ok: false, reason: "payment_claim" };
  return { ok: true, text };
}

export function verifyFreeformReply(reply: string, context: CatalogueContext, customerText = ""): string | null {
  const result = explainFreeformReply(reply, context, customerText);
  return result.ok ? result.text : null;
}
