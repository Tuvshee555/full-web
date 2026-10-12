import { stockLevel, stockLabel } from "../utils/stockLevel.js";

export const money = (value) => `${Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 })}₮`;
const localized = (locale, mn, en) => locale === "en" ? en : mn;
export const unsafeClaim = (text) => /100\s*%|(?:guarantee|regrow|cure)\b|баталгаатай.*үр\s*дүн|\d+\s*(?:хоног|өдөр|days?|weeks?).*(?:ург|grow)|(?:ург|grow).*\d+\s*(?:хоног|өдөр|days?|weeks?)/i.test(text);
const safeProductText = (text) => text && !unsafeClaim(text) && !/₮|\bMNT\b|almost\s+gone|sold\s*out|дуусаж\s+байна|дууссан/iu.test(text);

/** The only product price/stock formatter. The verifier invokes this same function. */
export function formatProductLine(product, context) {
  const { locale, settings } = context;
  const lines = [`${product.foodName} — ${money(product.price)}`];
  if (product.oldPrice != null && product.oldPrice > product.price) {
    const percent = Math.round((1 - product.price / product.oldPrice) * 100);
    lines.push(localized(locale, `Өмнөх үнэ: ${money(product.oldPrice)} · ${percent}% хямдрал`, `Previous price: ${money(product.oldPrice)} · ${percent}% off`));
  }
  for (const size of product.sizes || []) {
    const level = stockLevel(size, settings.lowStockThreshold);
    const badge = stockLabel(level, locale);
    const count = settings.showExactStock && size.stock != null ? ` (${size.stock})` : "";
    lines.push(`${size.label}${badge ? ` · ${badge}` : ""}${count}`);
  }
  lines.push(`${context.site}/${locale}/products/${encodeURIComponent(product.id)}`);
  return lines.join("\n");
}

export function contactFallback(context) {
  const contact = [context.store.contact.phone, context.store.contact.email].filter(Boolean).join(" · ");
  return localized(context.locale, "Одоогоор мэдээллийг баталгаажуулж чадсангүй. Манай ажилтантай холбогдоно уу:", "I cannot verify that information right now. Please contact our team:") + `\n${contact}`;
}

const STATUSES = {
  PENDING: ["Хүлээгдэж байна", "Pending"], WAITING_PAYMENT: ["Төлбөр хүлээж байна", "Awaiting payment"],
  COD_PENDING: ["Төлбөр хүлээж байна", "Awaiting payment"], PAID: ["Төлбөр төлөгдсөн", "Paid"],
  DELIVERING: ["Хүргэлтэд гарсан", "On the way"], DELIVERED: ["Хүргэгдсэн", "Delivered"], CANCELLED: ["Цуцлагдсан", "Cancelled"],
};

/** Render a finite evidence plan. No model-written facts ever reach a customer. */
export function renderReply(plan, context) {
  const { locale, settings } = context;
  const say = (mn, en) => localized(locale, mn, en);
  const products = plan.productIds.map((id) => context.products.find((p) => p.id === id));
  if (products.some((p) => !p)) throw new Error("UNKNOWN_PRODUCT");
  let needsHuman = false;
  const parts = [];
  const unknown = () => { needsHuman = true; return contactFallback(context); };
  const productIntents = ["catalogue", "price", "sizes", "availability", "ingredients", "howTo", "productFaq", "recommend"];
  if (plan.intents.some((i) => productIntents.includes(i))) {
    if (!products.length) parts.push(unknown());
    else {
      if (plan.intents.includes("recommend")) parts.push(say("Манай каталогоос дараах сонголтыг үзэж болно. Үр дүнг батлахгүй.", "You can explore these catalogue options. Results are not guaranteed."));
      for (const p of products) {
        parts.push(formatProductLine(p, context));
        const content = { ...context.content.default, ...context.content[p.id] };
        if (plan.intents.includes("recommend")) {
          const description = content.tagline || p.ingredients;
          if (safeProductText(description)) parts.push(description);
        }
        if (plan.intents.includes("ingredients")) {
          const text = content.fullIngredients || p.ingredients;
          parts.push(safeProductText(text) ? say("Найрлага: ", "Ingredients: ") + text : unknown());
          for (const ingredient of content.keyIngredients || []) {
            const text = `${ingredient.name}: ${ingredient.text}`;
            if (safeProductText(text)) parts.push(text);
          }
        }
        if (plan.intents.includes("howTo")) {
          const steps = content.howTo?.filter(safeProductText);
          parts.push(steps?.length ? say("Хэрэглэх заавар:\n", "How to use:\n") + steps.map((s) => `• ${s}`).join("\n") : unknown());
        }
        if (plan.intents.includes("productFaq")) {
          const answers = (plan.faqIndexes || []).map((index) => content.faq?.[index]?.a).filter((answer) => answer && !unsafeClaim(answer) && !/₮|\bMNT\b|stock|нөөц|хямдрал|discount/i.test(answer));
          parts.push(answers.length ? answers.join("\n") : unknown());
        }
      }
    }
  }
  for (const intent of plan.intents) {
    if (productIntents.includes(intent)) continue;
    if (intent === "greeting") parts.push(locale === "en" ? settings.greetingEn : settings.greetingMn);
    else if (intent === "thanks") parts.push(say("Баярлалаа. Өөр асуух зүйл байвал бичээрэй.", "Thank you. Let us know if you have another question."));
    else if (intent === "delivery") {
      parts.push(say(`Хүргэлтийн төлбөр: ${money(context.deliveryFee)}.`, `Delivery fee: ${money(context.deliveryFee)}.`));
      const faq = context.brand.faq.find((f) => /delivery|хүргэлт/i.test(f.q));
      if (faq) parts.push(faq.a);
    } else if (intent === "payment") {
      parts.push(say("Зөвхөн QPay эсвэл банкны шилжүүлгээр төлнө. Бүтээгдэхүүнээ сагсанд нэмээд захиалгаа баталгаажуулна.", "Pay with QPay or bank transfer only. Add products to your cart, then complete checkout."));
      parts.push(`${context.site}/${locale}/cart\n${context.site}/${locale}/checkout`);
    } else if (intent === "bank") {
      const bank = context.store.bank;
      parts.push(say("Банкны шилжүүлэг:", "Bank transfer:"), `${bank.name}\n${bank.holder}\n${bank.account}`, say("Гүйлгээний утгад захиалгын дугаараа бичнэ үү.", "Use your order number as the payment reference."));
    } else if (intent === "order") {
      if (!plan.hasOrderCredentials) parts.push(say("Захиалгын дугаар болон тухайн захиалгад бүртгэсэн утасны дугаараа хамт бичнэ үү.", "Please provide your order number and the phone number registered on that order."));
      else if (!plan.orderStatus || !STATUSES[plan.orderStatus]) parts.push(say("Захиалгын дугаар, утасны мэдээллийг баталгаажуулж чадсангүй. Хоёуланг нь шалгаад дахин бичнэ үү.", "I could not verify the order number and phone number. Please check both and try again."));
      else parts.push(say("Захиалгын төлөв: ", "Order status: ") + STATUSES[plan.orderStatus][locale === "en" ? 1 : 0]);
    } else if (intent === "returns") {
      const faq = context.brand.faq.find((f) => /return|буцаа/i.test(f.q));
      parts.push(faq ? faq.a : unknown());
    } else if (intent === "about") parts.push(context.brand.about.join("\n"));
    else if (intent === "contact") parts.push([context.store.contact.phone, context.store.contact.email].filter(Boolean).join(" · "));
    else if (intent === "medical") {
      needsHuman = true;
      parts.push(say("Үс ургалт, хугацаа, эмчилгээний үр дүнг батлах мэдээлэл байхгүй. Манай ажилтнаас тодруулна уу.", "We have no verified information guaranteeing hair growth, a timeframe or medical results. Please ask our team."));
    } else if (intent === "handoff") needsHuman = true;
    else if (intent === "knowledge") {
      const knowledge = locale === "en" ? settings.extraKnowledgeEn : settings.extraKnowledgeMn;
      // Knowledge is never a competing catalogue, stock or medical source.
      parts.push(knowledge && !unsafeClaim(knowledge) && !/₮|\bMNT\b|stock|нөөц|хямдрал|discount|price|үнэ/i.test(knowledge) ? knowledge : unknown());
    } else parts.push(unknown());
  }
  if (needsHuman) parts.push(locale === "en" ? settings.handoffEn : settings.handoffMn);
  const text = [...new Set(parts.filter(Boolean))].join("\n\n");
  // Keep the complete verified answer within every channel's text budget; never cut a fact or link.
  if (text.length > 1800) return { text: contactFallback(context) + "\n\n" + (locale === "en" ? settings.handoffEn : settings.handoffMn), needsHuman: true };
  return { text, needsHuman };
}

export function verifyReply(text, plan, context) {
  try {
    const expected = renderReply(plan, context).text;
    // Full evidence equality rejects injected names, wrong prices, unsafe prose and altered stock wording.
    return Boolean(text) && text === expected;
  } catch { return false; }
}
