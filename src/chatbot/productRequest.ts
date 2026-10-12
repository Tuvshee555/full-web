import type { CatalogProduct } from "./types";
import { stripProductNamesForIntent } from "./customerTurn";
import { normText, phoneticLatinText } from "./textNorm";
import type { Understanding } from "./productUnderstanding";

export const PRODUCT_TOPICS = ["price", "availability", "variants", "ingredients", "usage", "photos", "comparison", "budget", "discount"] as const;
export type ProductTopic = typeof PRODUCT_TOPICS[number];
export type ProductSelection = { productId: string; variantId: string | null };
export type ProductRequest = { topics: ProductTopic[]; variantId: string | null; variant: string | null };

/** Source request planner: read topics from the customer's turn, then merge explicit variant selection. */
export function buildProductRequest(text: string, products: CatalogProduct[], understanding?: Understanding): ProductRequest {
  const turn = stripProductNamesForIntent(text, products);
  const topics = new Set<ProductTopic>(understanding?.topics || []);
  const patterns: Array<[ProductTopic, RegExp]> = [
    ["price", /үнэ|үнийн|хэд\s*(?:вэ|төг)|price|cost|how\s*much|une|vne/i],
    ["availability", /нөөц|дууссан|бэлэн|байгаа\s*(?:юу|уу)|байна\s*уу|available|stock|bgaa|baigaa/i],
    ["variants", /өнгө|хэмжээ|color|colour|size|variant|ungu|hemjee/i],
    ["ingredients", /найрлага|орц|ingredient|orts|nairlaga/i],
    ["usage", /хэрэгл|түрх|яаж|how\s*(?:do|to)|use\b|apply|heregle|tureh|yaj/i],
    ["photos", /зураг|photo|picture|zurag/i],
    ["comparison", /харьцуул|ялгаа|compare|difference/i],
    ["budget", /хамгийн\s*хямд|төсөв|budget|cheapest/i],
    ["discount", /хямдр|хөнгөл|урамшуул|discount|promo|bundle|deal|hyamdr/i],
  ];
  for (const [topic, pattern] of patterns) if (pattern.test(turn)) topics.add(topic);
  const variantName = understanding?.variant || null;
  const variants = products.flatMap((product) => product.sizes);
  const query = normText(text);
  const phonetic = phoneticLatinText(text);
  const named = variants.filter((variant) => (variantName && normText(variant.label) === normText(variantName))
    || (normText(variant.label).length >= 3 && query.includes(normText(variant.label)))
    || (phoneticLatinText(variant.label).length >= 3 && phonetic.includes(phoneticLatinText(variant.label))));
  if (named.length) topics.add("availability");
  return { topics: [...topics], variantId: named.length === 1 ? named[0].id : null, variant: named[0]?.label || variantName };
}

export function mergeProductSelection(productId: string, request: ProductRequest, previous: ProductSelection | null): ProductSelection {
  const same = previous?.productId === productId ? previous : null;
  return { productId, variantId: request.variantId || same?.variantId || null };
}
