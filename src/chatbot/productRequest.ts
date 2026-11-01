import type { CatalogProduct } from "./types";
import { stripProductNamesForIntent } from "./customerTurn";
import { normText, phoneticLatinText } from "./textNorm";
import type { Understanding } from "./productUnderstanding";

export const PRODUCT_TOPICS = ["price", "availability", "variants", "volume", "ingredients", "usage", "photos", "comparison", "budget", "discount", "faq"] as const;
export type ProductTopic = typeof PRODUCT_TOPICS[number];
export type ProductSelection = { productId: string; variantId: string | null };
export type ProductRequest = { topics: ProductTopic[]; variantId: string | null; variant: string | null };

/** Source request planner: read topics from the customer's turn, then merge explicit variant selection. */
export function buildProductRequest(text: string, products: CatalogProduct[], understanding?: Understanding): ProductRequest {
  const turn = normText(stripProductNamesForIntent(text, products));
  const topics = new Set<ProductTopic>(understanding?.topics || []);
  const patterns: Array<[ProductTopic, RegExp]> = [
    ["price", /үнэ|үнийн|хэд\s*(?:вэ|төг)|хэдтэй|хэдэн\s*төгрөг|price|cost|how\s*much/i],
    ["availability", /нөөц|дууссан|бэлэн|байгаа\s*(?:юу|уу)|байна\s*уу|available|in\s+stock|stock|sold\s+out/i],
    ["variants", /өнгө|color|colour|variant|shade|сонголт/i],
    ["volume", /хэдэн\s*(?:мл|ml)|(?<!\p{L})(?:мл|ml)(?!\p{L})|millilit|how\s+many\s+(?:ml|мл)|хэмжээ(?:тэй)?\s*(?:нь)?\s*(?:хэд|юу|вэ)|хэмжээ(?:тэй)?\s*(?:вэ|юу)|хэдий\s+хэмжээ|size\s+in\s+(?:ml|мл)|how\s+big/iu],
    ["ingredients", /найрлага|орц|ingredient|what(?:'s|\s+is)\s+in\s+it|бүрэлдэхүүн/i],
    ["usage", /хэрэгл|түрх|яаж|хэрхэн|заавар|how\s*(?:do|to|often|long)|use\b|apply|direction|instruction|өдөрт\s+хэд|хэдэн\s+удаа|хугацаанд|хэдий\s+хугац|how\s+many\s+times/i],
    ["photos", /зураг|photo|picture/i],
    ["comparison", /харьцуул|ялгаа|compare|difference/i],
    ["budget", /хамгийн\s*хямд|төсөв|budget|cheapest/i],
    ["discount", /хямдр|хөнгөл|урамшуул|discount|promo|bundle|deal/i],
  ];
  for (const [topic, pattern] of patterns) if (pattern.test(turn)) topics.add(topic);
  // "хэмжээ" alone can mean a shade/size choice; volume wins only when the product publishes one.
  if (topics.has("volume") && /өнгө|color|colour|shade/i.test(turn)) topics.add("variants");
  const variantName = understanding?.variant || null;
  const variants = products.flatMap((product) => product.sizes);
  const query = normText(text);
  const phonetic = phoneticLatinText(text);
  const named = variants.filter((variant) => (variantName && normText(variant.label) === normText(variantName))
    || (normText(variant.label).length >= 3 && query.includes(normText(variant.label)))
    || (phoneticLatinText(variant.label).length >= 3 && phonetic.includes(phoneticLatinText(variant.label))));
  // "хар хүрэн" names the shade "Хар хүрэн", not the shorter "Хүрэн" it also contains: the longest
  // label wins, and only variants with that exact label count as named.
  const longest = named.reduce<string | null>((best, variant) => (best === null || variant.label.length > best.length ? variant.label : best), null);
  const exact = longest ? named.filter((variant) => variant.label === longest) : [];
  if (exact.length) topics.add("availability");
  return { topics: [...topics], variantId: exact.length === 1 ? exact[0].id : null, variant: exact[0]?.label || variantName };
}

export function mergeProductSelection(productId: string, request: ProductRequest, previous: ProductSelection | null): ProductSelection {
  const same = previous?.productId === productId ? previous : null;
  return { productId, variantId: request.variantId || same?.variantId || null };
}
