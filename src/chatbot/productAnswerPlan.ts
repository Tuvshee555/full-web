/** Source answer planner: requested topic sections, missing evidence and selection have one ordered path. */
import { buildProductRequest, type ProductSelection, type ProductTopic } from "./productRequest";
import { formatProductLine, formatVariantLine, productLink, variantOwnPrice } from "./productPriceBlock";
import { contentOf, safeProductText, verifiedVolume } from "./productFacts";
import { matchFaq } from "./knowledge";
import type { CatalogProduct, CatalogueContext } from "./types";
import type { FastPathRoute } from "./fastPathRouting";
export type ProductAnswerPlan = {
  status: "answered" | "clarify" | "handoff"; productIds: string[]; selection: ProductSelection | null;
  reply: string; answeredTopics: ProductTopic[]; missingTopics: ProductTopic[];
  /** Facts the customer asked for that the owner has not published yet (the reply says so honestly). */
  unpublished: ProductTopic[];
};
const NEWLINE = String.fromCharCode(10);

/** "5 мл" from the verified published volume, or from a size label that carries one. */
export function productVolume(product: CatalogProduct): string | null {
  const verified = verifiedVolume(product);
  if (verified) return verified;
  const fromSizes = product.sizes.map((size) => size.label).filter((label) => /\d\s*(?:мл|ml|г|g|gr)(?!\p{L})/iu.test(label));
  return fromSizes.length ? fromSizes.join(", ") : null;
}

export function buildProductAnswerPlan(input: { text: string; context: CatalogueContext; route: FastPathRoute; pendingTopics?: ProductTopic[] }): ProductAnswerPlan | null {
  const { context, route } = input;
  const say = (mn: string, en: string) => context.locale === "en" ? en : mn;
  const contactLine = [context.store.contact.phone, context.store.contact.email].filter(Boolean).join(" · ");
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
  const lines: string[] = []; const answered = new Set<ProductTopic>(); const missing = new Set<ProductTopic>(); const unpublished = new Set<ProductTopic>();
  const clarify = products.length > 1 && topics.some((topic) => topic === "usage" || topic === "ingredients" || topic === "volume" || topic === "duration" || topic === "storage");
  if (clarify) {
    lines.push(say("Аль бүтээгдэхүүн бэ?", "Which product do you mean?"));
    lines.push(...products.slice(0, 5).map((product, index) => `${index + 1}) ${formatProductLine(product, context)}`));
    return { status: "clarify", productIds: products.slice(0, 5).map((product) => product.id), selection: selected, reply: lines.join("\n"), answeredTopics: [], missingTopics: [], unpublished: [] };
  }
  let sharedNote = "";
  for (const [index, product] of products.slice(0, 3).entries()) {
    const content = contentOf(product, context);
    const header = formatProductLine(product, context, { showDiscount: topics.includes("discount"), showStock: topics.includes("availability") });
    // One paragraph per product: its header line, then the answered sections.
    const block: string[] = [products.length > 1 ? `${index + 1}) ${header}` : header];
    const sections: Partial<Record<ProductTopic, string>> = {};
    // The owner's own answer to this exact question comes first and is quoted verbatim.
    const faqHit = matchFaq(input.text, content.faq || []);
    if (faqHit && safeProductText(faqHit.item.a, context.locale)) { sections.faq = faqHit.item.a; answered.add("faq"); }
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
      else sections.variants = say("Энэ бүтээгдэхүүн нэг л хувилбартай.", "This product comes in one version.");
    }
    if (topics.includes("volume")) {
      const volume = productVolume(product);
      if (volume) sections.volume = say(`Хэмжээ: ${volume}`, `Volume: ${volume}`);
      else if (product.sizes.length) sections.volume = sizeLines.join(NEWLINE);
      else { sections.volume = say(`Хэмжээний мэдээллийг одоогоор нийтлээгүй байна. Ажилтнаас тодруулж болно: ${contactLine}`, `The volume is not published yet. Our team can confirm it: ${contactLine}`); unpublished.add("volume"); }
    }
    if (topics.includes("ingredients")) {
      const text = content.fullIngredients || "";
      if (safeProductText(text, context.locale)) sections.ingredients = say("Найрлага: ", "Ingredients: ") + text;
      else { sections.ingredients = say(`Найрлагын жагсаалтыг одоогоор нийтлээгүй байна. Ажилтнаас тодруулж болно: ${contactLine}`, `The ingredient list is not published yet. Our team can confirm it: ${contactLine}`); unpublished.add("ingredients"); }
    }
    if (topics.includes("usage")) {
      const steps = content.howTo?.filter((step) => safeProductText(step, context.locale));
      if (steps?.length) {
        sections.usage = say("Хэрэглэх заавар:\n", "How to use:\n") + steps.map((step) => `• ${step}`).join("\n");
        if (content.frequency && safeProductText(content.frequency, context.locale)) sections.usage += `\n${say("Давтамж: ", "How often: ")}${content.frequency}`;
        if (content.safety && safeProductText(content.safety, context.locale)) sections.usage += `\n${say("Анхаарах: ", "Note: ")}${content.safety}`;
      } else if (content.howTo?.length && context.locale === "en") {
        sections.usage = `The published instructions are in Mongolian on the product page: ${productLink(product, context)}`;
      } else if (!faqHit) { sections.usage = say(`Хэрэглэх зааврыг одоогоор нийтлээгүй байна. Ажилтнаас тодруулж болно: ${contactLine}`, `The usage instructions are not published yet. Our team can help: ${contactLine}`); unpublished.add("usage"); }
    }
    // How long to use it: the owner's own FAQ answer or the published frequency; never a guessed course or a result.
    if (topics.includes("duration")) {
      const durationFaq = (content.faq || []).find((item) => /хугацаа|удаан|сар|долоо\s*хоног|хэдэн\s+өдөр|how\s+long|weeks|months|duration|course/iu.test(item.q) && safeProductText(item.a, context.locale));
      if (faqHit && durationFaq && faqHit.item.q === durationFaq.q) answered.add("duration");
      else if (durationFaq) sections.duration = durationFaq.a;
      else if (content.frequency && safeProductText(content.frequency, context.locale)) sections.duration = say(`Хэрэглэх давтамж: ${content.frequency}`, `How often: ${content.frequency}`);
      else { sections.duration = say(`Хэрэглэх хугацааны зөвлөмжийг одоогоор нийтлээгүй байна. Ажилтнаас тодруулж болно: ${contactLine}`, `How long to use it is not published yet. Our team can confirm it: ${contactLine}`); unpublished.add("duration"); }
    }
    if (topics.includes("storage")) {
      if (content.storage && safeProductText(content.storage, context.locale)) sections.storage = say(`Хадгалах: ${content.storage}`, `Storage: ${content.storage}`);
      else { sections.storage = say(`Хадгалах нөхцөлийг одоогоор нийтлээгүй байна. Ажилтнаас тодруулж болно: ${contactLine}`, `Storage information is not published yet. Our team can confirm it: ${contactLine}`); unpublished.add("storage"); }
    }
    if (topics.includes("photos")) sections.photos = productLink(product, context);
    if (topics.includes("discount")) {
      if (product.oldPrice && product.oldPrice > product.price) sections.discount = say("Дээрх үнэд бүтээгдэхүүний идэвхтэй хямдрал орсон.", "The current product discount is reflected in the price above.");
      else { sections.discount = ""; sharedNote = say("Багцын нэмэлт хөнгөлөлт одоогоор заагаагүй байна. Дээрх нь нэг бүрийн үнэ; ажилтнаас тодруулж болно.", "No additional bundle offer is listed. The prices above are per item; our team can confirm further offers."); }
    }
    if (topics.includes("comparison")) { sections.comparison = ""; sharedNote ||= say("Бүтээгдэхүүн тус бүрийн дэлгэрэнгүйг холбоосоор үзнэ үү.", "Each product link has its published details."); }
    if (topics.includes("budget")) answered.add("budget");
    const seen = new Set<string>();
    const ordered: ProductTopic[] = [...(sections.faq ? ["faq" as ProductTopic] : []), ...topics];
    for (const topic of ordered) {
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
  else if (answered.size && !missing.size && !unpublished.size) lines.push(say("Захиалах бол «авъя» гэж бичээрэй, эсвэл бүтээгдэхүүний хуудаснаас сагсандаа нэмээрэй.", "To order, write \"buy\" here or add it to your cart from the product page."));
  return { status: answered.size === 0 ? "handoff" : "answered", productIds: products.slice(0, 3).map((product: CatalogProduct) => product.id), selection: selected, reply: lines.join("\n\n"), answeredTopics: [...answered], missingTopics: [...missing], unpublished: [...unpublished] };
}
