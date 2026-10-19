/** Source answer planner: requested topic sections, missing evidence and selection have one ordered path. */
import { buildProductRequest, type ProductSelection, type ProductTopic } from "./productRequest";
import { formatProductLine, formatVariantLine, productLink, variantOwnPrice } from "./productPriceBlock";
import { contentOf, safeProductText } from "./productFacts";
import type { CatalogProduct, CatalogueContext } from "./types";
import type { FastPathRoute } from "./fastPathRouting";
export type ProductAnswerPlan = {
  status: "answered" | "clarify" | "handoff"; productIds: string[]; selection: ProductSelection | null;
  reply: string; answeredTopics: ProductTopic[]; missingTopics: ProductTopic[];
};
const NEWLINE = String.fromCharCode(10);
export function buildProductAnswerPlan(input: { text: string; context: CatalogueContext; route: FastPathRoute; pendingTopics?: ProductTopic[] }): ProductAnswerPlan | null {
  const { context, route } = input;
  const say = (mn: string, en: string) => context.locale === "en" ? en : mn;
  const ids = route.chosenProductId ? [route.chosenProductId] : route.understanding?.products.map((product) => product.id) || [];
  let products = route.scopedClarify?.length ? route.scopedClarify : context.products.filter((product) => ids.includes(product.id));
  if (!products.length) return null;
  const request = buildProductRequest(input.text, products, route.understanding);
  // A named colour/size that only some of the candidates have narrows the list to those.
  if (request.variant && products.length > 1) {
    const having = products.filter((product) => product.sizes.some((variant) => variant.label === request.variant));
    if (having.length) products = having;
  }
  // "the first one" after "how do I use it?": answer the question that was pending, not a default price.
  const topics = request.topics.length ? request.topics : input.pendingTopics?.length ? input.pendingTopics : ["price"] as ProductTopic[];
  const selected = route.selection || null;
  const lines: string[] = []; const answered = new Set<ProductTopic>(); const missing = new Set<ProductTopic>();
  const clarify = products.length > 1 && topics.some((topic) => topic === "usage" || topic === "ingredients");
  if (clarify) {
    lines.push(say("Аль бүтээгдэхүүн бэ?", "Which product do you mean?"));
    lines.push(...products.slice(0, 5).map((product, index) => `${index + 1}) ${formatProductLine(product, context)}`));
    return { status: "clarify", productIds: products.slice(0, 5).map((product) => product.id), selection: selected, reply: lines.join("\n"), answeredTopics: [], missingTopics: [] };
  }
  let sharedNote = "";
  for (const [index, product] of products.slice(0, 3).entries()) {
    const content = contentOf(product, context);
    const header = formatProductLine(product, context, { showDiscount: topics.includes("discount"), showStock: topics.includes("availability") });
    // One paragraph per product: its header line, then the answered sections.
    const block: string[] = [products.length > 1 ? `${index + 1}) ${header}` : header];
    const sections: Partial<Record<ProductTopic, string>> = {};
    // A price question on a product whose sizes cost different amounts lists each size with its price.
    const sizeLines = product.sizes.map((variant) => formatVariantLine(variant, context));
    sections.price = product.sizes.some((variant) => variantOwnPrice(variant) !== null) ? sizeLines.join(NEWLINE) : "";
    if (topics.includes("price")) answered.add("price");
    if (topics.includes("variants") || topics.includes("availability")) {
      const variants = request.variant ? product.sizes.filter((variant) => variant.label === request.variant) : selected?.productId === product.id && selected.variantId ? product.sizes.filter((variant) => variant.id === selected.variantId) : product.sizes;
      // An untracked variant (stock not counted) is on sale: say it can be ordered, never invent a count.
      const orderable = say("захиалах боломжтой", "available to order");
      if (variants.length) {
        const labels = variants.map((variant) => {
          const line = formatVariantLine(variant, context);
          return topics.includes("availability") && line === variant.label ? `${line} — ${orderable}` : line;
        });
        sections.variants = labels.join("\n"); sections.availability = sections.variants;
      } else if (request.variant) sections.availability = say("Энэ өнгө/хэмжээ каталогт байхгүй байна.", "That variant is not listed for this product.");
      else if (topics.includes("availability")) sections.availability = say("Захиалах боломжтой.", "Available to order.");
      else sections.variants = say("Өнгө, хэмжээний нэмэлт мэдээллийг ажилтнаас тодруулж болно.", "Our team can confirm further variant information.");
    }
    if (topics.includes("ingredients")) {
      const text = content.fullIngredients || product.ingredients;
      if (safeProductText(text, context.locale)) sections.ingredients = say("Найрлага: ", "Ingredients: ") + text;
      else sections.ingredients = say("Найрлагын дэлгэрэнгүйг бүтээгдэхүүний хуудсаас үзнэ үү.", "See the product page for the published ingredient information.");
    }
    if (topics.includes("usage")) {
      const steps = content.howTo?.filter((step) => safeProductText(step, context.locale));
      if (steps?.length) sections.usage = say("Хэрэглэх заавар:\n", "How to use:\n") + steps.map((step) => `• ${step}`).join("\n");
      else sections.usage = say("Хэрэглэх зааврыг бүтээгдэхүүний хуудсаас үзнэ үү. Нэмэлт мэдээллийг ажилтнаас тодруулж болно.", "See the product page for the published instructions. Our team can help with further details.");
    }
    if (topics.includes("photos")) sections.photos = productLink(product, context);
    if (topics.includes("discount")) {
      if (product.oldPrice && product.oldPrice > product.price) sections.discount = say("Дээрх үнэд бүтээгдэхүүний идэвхтэй хямдрал орсон.", "The current product discount is reflected in the price above.");
      else { sections.discount = ""; sharedNote = say("Багцын нэмэлт хөнгөлөлт одоогоор заагаагүй байна. Дээрх нь нэг бүрийн үнэ; ажилтнаас тодруулж болно.", "No additional bundle offer is listed. The prices above are per item; our team can confirm further offers."); }
    }
    if (topics.includes("comparison")) { sections.comparison = ""; sharedNote ||= say("Бүтээгдэхүүн тус бүрийн дэлгэрэнгүйг холбоосоор үзнэ үү.", "Each product link has its published details."); }
    if (topics.includes("budget")) answered.add("budget");
    const seen = new Set<string>();
    for (const topic of topics) {
      if (sections[topic] !== undefined) { if (sections[topic] && !seen.has(sections[topic]!)) { block.push(sections[topic]!); seen.add(sections[topic]!); } answered.add(topic); }
      else if (!answered.has(topic)) missing.add(topic);
    }
    lines.push(block.join("\n"));
  }
  if (sharedNote) lines.push(sharedNote);
  if (missing.size && answered.size) lines.push(say("Үлдсэн асуултыг ажилтнаас тодруулж болно.", "Our team can confirm the remaining details."));
  if (answered.size && products.length > 1) lines.unshift(route.scopedClarify?.length && !route.chosenProductId
    ? say("Аль бүтээгдэхүүнийг сонирхож байна вэ?", "Which one are you interested in?")
    : say("Таны асуусан бүтээгдэхүүнүүд:", "Here are the matching products:"));
  else if (answered.size && !missing.size) lines.push(say("Захиалах бол бүтээгдэхүүний хуудаснаас сагсандаа нэмээрэй.", "You can add it to your cart from the product page."));
  return { status: answered.size === 0 ? "handoff" : "answered", productIds: products.slice(0, 3).map((product: CatalogProduct) => product.id), selection: selected, reply: lines.join("\n\n"), answeredTopics: [...answered], missingTopics: [...missing] };
}
