/**
 * Purchase intent and the chat order draft (the commerce adapter of the conversation engine).
 *
 * "Нэгийг авъя" / "serum avya" / "order it" starts a purchase: the product (named, picked from the
 * last list, or the one in focus), its variant and quantity are confirmed, stock is checked, and
 * the customer gets the server-priced summary with a checkout link that pre-fills the cart. If chat
 * orders are enabled, "энд захиалъя" continues in the chat: name and phone, then the delivery
 * address, then a summary the customer must confirm with "тийм" before `placeOrder` runs. The
 * total is always computed here from the catalogue, never taken from the customer or the model,
 * and nothing is ever described as paid.
 *
 * Pure: state in, reply and state patch out. The real order service is injected (handler.ts).
 */
import type { CatalogProduct, CatalogueContext, ChatOrderRequest, ConversationState, HandoffReason, Locale, OrderDraft, PlaceChatOrder, ProductVariant } from "../types";
import { formatVariantLine, money, productLink, variantOwnPrice } from "../productPriceBlock";
import { stockLabel, stockLevel } from "../../../server/utils/stockLevel.js";
import { intentProbe, normText, phoneticLatinText } from "../textNorm";
import { parseNumberedChoice } from "../fastPathRouting";
import { AIMAGS, AIMAG_DISTRICTS, ULAANBAATAR_DISTRICTS } from "../../data/mongoliaLocations";

export const DRAFT_TTL_MS = 30 * 60 * 1000;
const MAX_QUANTITY = 999;

export const BUY_INTENT = /(?:^|[^\p{L}])(?:авъя|авья|авая|авмаар|авна|авч\s+болох|авах\s+(?:гэсэн|хүсэлтэй|уу|боломж|гэж)|худалдаж\s+ав|худалдан\s+ав|захиалъя|захиалья|захиаля|захиалмаар|захиална|захиалах\s+(?:гэсэн|гэж|хүсэлтэй)|захиалга\s+(?:өгье|өгъе|өгмөөр|өгнө|хийе|хийье|хиймээр|хийх\s+гэсэн|үүсгэ)|нэгийг\s+ав|авч\s+үзье|\bbuy\b|\bpurchase\b|order\s+(?:it|one|this|that|now|the|a\b|two|2|3)|i(?:'ll|\s+will|\s+want\s+to|\s+would\s+like\s+to|'d\s+like\s+to)\s+(?:buy|order|take|get)|want\s+to\s+(?:buy|order)|place\s+(?:an?\s+)?order|take\s+(?:it|one|this))(?=$|[^\p{L}])/iu;
export const CHAT_ORDER_HERE = /(?:энд\s+захиал|энд\s+авъя|энд\s+үүсг|чатаар\s+(?:захиал|авъя|үүсг|өг)|дансаар\s+(?:захиал|авъя)|энд\s+бичээд|энд\s+хийе|here\s+in\s+(?:the\s+)?chat|order\s+here|in\s+(?:the\s+)?chat|via\s+chat|through\s+chat|by\s+bank\s+transfer\s+here)/iu;
export const YES = /^\s*(?:тийм|тиймээ|тийм\s*ээ|за|зөв|болно|болноо|баталгаажуул\p{L}*|бататгая|батлая|ok|okay|yes|yep|yeah|sure|confirm|confirmed|👍|✅)(?:[\s,.!]+(?:тийм|баталгаажуул\p{L}*|болно|за|зөв|ok|yes|please))*[\s!.]*$/iu;
export const NO = /^\s*(?:үгүй|үгүй\s*ээ|болих|болино|болилоо|больё|цуцал\p{L}*|хэрэггүй|болихоо|no|nope|cancel|stop|never\s*mind)(?:[\s,.!]+(?:болих|болино|цуцал\p{L}*|үгүй|хэрэггүй|it|that))*[\s!.]*$/iu;

const NUMBER_WORDS: Record<string, number> = { нэг: 1, нэгийг: 1, хоёр: 2, хоёрыг: 2, гурав: 3, гурван: 3, гуравыг: 3, дөрөв: 4, дөрвөн: 4, тав: 5, таван: 5, зургаа: 6, зургаан: 6, долоо: 7, долоон: 7, найм: 8, найман: 8, ес: 9, есөн: 9, арав: 10, арван: 10, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, ten: 10 };

/** "2 ширхэг", "2-ыг", "x2", "хоёр ширхэг", "гурван ш": the quantity a customer wants, or null. */
export function parseQuantity(text: string): number | null {
  const probe = normText(text);
  const explicit = /(?:^|\s)(\d{1,3})\s*(?:ширхэг|шир|ш|pcs?|pieces?|x|×|ыг|ийг|г|ийн|юм)(?=\s|$)/u.exec(probe)
    || /(?:^|\s)(?:x|×)\s*(\d{1,3})(?=\s|$)/u.exec(probe)
    || /(\d{1,3})\s*-\s*(?:ыг|ийг|г)/u.exec(text);
  if (explicit) return clampQuantity(Number(explicit[1]));
  const words = probe.split(/\s+/);
  for (let index = 0; index < words.length; index += 1) {
    const value = NUMBER_WORDS[words[index]];
    if (value && /^(?:ширхэг|шир|ш|pcs?|pieces?|авъя|авах|захиалах|захиалъя|авна|авмаар)$/u.test(words[index + 1] || "")) return clampQuantity(value);
    if (value && /ыг$|ийг$/u.test(words[index])) return clampQuantity(value);
  }
  return null;
}
const clampQuantity = (value: number) => (Number.isFinite(value) && value >= 1 ? Math.min(MAX_QUANTITY, Math.trunc(value)) : null);

/** The checkout link that puts this item in the cart and opens the real checkout (QPay or bank). */
export function buyLink(product: CatalogProduct, variantLabel: string | null, quantity: number, context: CatalogueContext): string {
  const params = new URLSearchParams();
  if (variantLabel) params.set("size", variantLabel);
  if (quantity > 1) params.set("qty", String(quantity));
  const query = params.toString();
  return `${context.site}/${context.locale}/buy/${encodeURIComponent(product.id)}${query ? `?${query}` : ""}`;
}

export function readDraft(state: ConversationState, now = Date.now()): OrderDraft | null {
  const draft = state.orderDraft as OrderDraft | null | undefined;
  if (!draft || typeof draft !== "object" || typeof draft.step !== "string") return null;
  if (!Number.isFinite(draft.updatedAt) || now - draft.updatedAt > DRAFT_TTL_MS) return null;
  return { ...draft, quantity: clampQuantity(Number(draft.quantity)) ?? 1 };
}

/** The variant the text names on this product (longest label wins), or a numbered pick, or null. */
export function matchVariant(text: string, product: CatalogProduct, numbered = false): ProductVariant | null {
  const query = normText(text);
  const phonetic = phoneticLatinText(text);
  const named = product.sizes
    .filter((variant) => (normText(variant.label).length >= 2 && query.includes(normText(variant.label))) || (phoneticLatinText(variant.label).length >= 3 && phonetic.includes(phoneticLatinText(variant.label))))
    .sort((a, b) => b.label.length - a.label.length);
  if (named.length) return named[0];
  if (numbered) {
    const choice = parseNumberedChoice(text);
    if (choice && !choice.namePrefix && product.sizes[choice.index]) return product.sizes[choice.index];
  }
  return null;
}

/** Unit price: the variant's own price, otherwise the product price. */
export function unitPriceOf(product: CatalogProduct, variantLabel: string | null): number {
  const variant = variantLabel ? product.sizes.find((size) => size.label === variantLabel) : null;
  return (variant ? variantOwnPrice(variant) : null) ?? product.price;
}

type DistrictMatch = { zone: "UB" | "RURAL"; city: string; district: string };
const latinDistricts: Array<[RegExp, string]> = [
  [/bayanzurh|bayanzurkh|bzd/i, "Баянзүрх"], [/bayangol|bgd/i, "Баянгол"], [/songino|shd/i, "Сонгинохайрхан"], [/suhbaatar|sukhbaatar|sbd/i, "Сүхбаатар"],
  [/han\s*-?\s*uul|khan\s*-?\s*uul|hud/i, "Хан-Уул"], [/chingeltei|chd/i, "Чингэлтэй"], [/nalaih|nalaikh/i, "Налайх"], [/baganuur/i, "Багануур"], [/bagahangai/i, "Багахангай"],
];
const squash = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

/** Where a parcel goes, read from free text: a city district, or an aimag (with its centre/sum when named). */
export function parseDistrict(text: string): DistrictMatch | null {
  const flat = squash(text);
  const rural = /аймаг|орон\s*нутаг|aimag|oron\s*nutag|сум\b/iu.test(text);
  if (!rural) {
    for (const district of ULAANBAATAR_DISTRICTS) if (flat.includes(squash(district))) return { zone: "UB", city: "Улаанбаатар", district };
    for (const [pattern, district] of latinDistricts) if (pattern.test(text)) return { zone: "UB", city: "Улаанбаатар", district };
  }
  for (const aimag of AIMAGS) {
    if (!flat.includes(squash(aimag))) continue;
    const sum = (AIMAG_DISTRICTS[aimag] || []).find((candidate) => flat.includes(squash(candidate)) && squash(candidate) !== squash(aimag));
    return { zone: "RURAL", city: aimag, district: sum || (AIMAG_DISTRICTS[aimag]?.[0] ?? aimag) };
  }
  if (rural) {
    for (const district of ULAANBAATAR_DISTRICTS) if (flat.includes(squash(district)) && district === "Сүхбаатар") return { zone: "RURAL", city: "Сүхбаатар", district: AIMAG_DISTRICTS["Сүхбаатар"]?.[0] ?? "Сүхбаатар" };
  }
  return null;
}

export function parseKhoroo(text: string): string | null {
  const match = /(\d{1,2})\s*(?:-|–)?\s*(?:р|дугаар|дүгээр|th|st|nd|rd)?\s*(?:хороо|horoo|khoroo)/iu.exec(text) || /(?:хороо|horoo|khoroo)\s*(?:№|#)?\s*(\d{1,2})/iu.exec(text);
  return match ? String(Number(match[1])) : null;
}

/** An 8-digit Mongolian phone number in the text (976 prefix and separators tolerated). */
export function parsePhone(text: string): string | null {
  const joined = text.replace(/(\d)[ \-.](?=\d)/g, "$1");
  const match = /(?:\+?976)?(\d{8})(?!\d)/.exec(joined.replace(/(?<=\d)\D+(?=\d{4}\b)/g, ""));
  if (match) return match[1];
  const loose = /(?<!\d)(\d{8})(?!\d)/.exec(joined);
  return loose ? loose[1] : null;
}

export function parseName(text: string, phone: string | null): string {
  const withoutPhone = phone ? text.replace(/\+?976/g, " ").replace(new RegExp(phone.split("").join("[ \\-.]?")), " ") : text;
  const words = withoutPhone.replace(/(?:миний\s+нэр|намайг|нэр|name(?:\s+is)?|ner|utas|утас|дугаар|phone)[:：]?/giu, " ").replace(/[^\p{L}\s'-]+/gu, " ").split(/\s+/).filter((word) => word.length >= 2).slice(0, 3);
  return words.join(" ").slice(0, 60);
}

const say = (locale: Locale, mn: string, en: string) => (locale === "en" ? en : mn);

function variantLineFor(variant: ProductVariant, context: CatalogueContext): string {
  const line = formatVariantLine(variant, context);
  return line === variant.label ? `${line} — ${say(context.locale, "захиалах боломжтой", "available to order")}` : line;
}

function variantPrompt(product: CatalogProduct, context: CatalogueContext, preface?: string): string {
  return [preface, say(context.locale, "Аль сонголтыг авах вэ?", "Which option would you like?"), ...product.sizes.map((variant, index) => `${index + 1}) ${variantLineFor(variant, context)}`)].filter(Boolean).join("\n");
}

function soldOutVariantReply(product: CatalogProduct, variant: ProductVariant, context: CatalogueContext): string {
  const others = product.sizes.filter((size) => size.id !== variant.id && stockLevel(size, context.settings.lowStockThreshold) !== "soldout");
  const head = `${product.productName}: ${variant.label} — ${stockLabel("soldout", context.locale)}.`;
  if (!others.length) return [head, say(context.locale, "Одоогоор бусад сонголт ч байхгүй байна. Ажилтнаас нөөцийн талаар лавлаж болно.", "No other option is available right now. Our team can tell you when it is back.")].join("\n");
  return [head, say(context.locale, "Бэлэн байгаа сонголт:", "Available options:"), ...others.map((size, index) => `${index + 1}) ${variantLineFor(size, context)}`), say(context.locale, "Аль нь вэ?", "Which one?")].join("\n");
}

export function offerReply(product: CatalogProduct, draft: OrderDraft, context: CatalogueContext): string {
  const locale = context.locale;
  const unit = unitPriceOf(product, draft.variantLabel || null);
  const subtotal = unit * draft.quantity;
  const total = subtotal + context.deliveryFee;
  const lines = [`${product.productName}${draft.variantLabel ? ` (${draft.variantLabel})` : ""} — ${money(unit)}`];
  if (draft.quantity > 1) lines.push(say(locale, `${draft.quantity} ширхэг × ${money(unit)} = ${money(subtotal)}`, `${draft.quantity} × ${money(unit)} = ${money(subtotal)}`));
  lines.push(say(locale, `Хүргэлт: ${money(context.deliveryFee)} · Нийт: ${money(total)}`, `Delivery: ${money(context.deliveryFee)} · Total: ${money(total)}`));
  lines.push(say(locale, "Захиалах (QPay эсвэл дансаар төлнө):", "Order here (QPay or bank transfer):"));
  lines.push(buyLink(product, draft.variantLabel || null, draft.quantity, context));
  if (context.settings.chatOrdersEnabled !== false) lines.push(say(locale, "Эсвэл энд чатаар захиалж дансаар төлөх бол «энд захиалъя» гэж бичнэ үү.", "Or write \"order here\" to place a bank-transfer order in this chat."));
  return lines.join("\n");
}

function confirmReply(product: CatalogProduct, draft: OrderDraft, context: CatalogueContext): string {
  const locale = context.locale;
  const unit = unitPriceOf(product, draft.variantLabel || null);
  const subtotal = unit * draft.quantity;
  const total = subtotal + context.deliveryFee;
  const place = [draft.city, draft.district, draft.khoroo && draft.khoroo !== "-" ? say(locale, `${draft.khoroo}-р хороо`, `khoroo ${draft.khoroo}`) : ""].filter(Boolean).join(", ");
  return [
    say(locale, "Захиалгын мэдээлэл:", "Order summary:"),
    `• ${product.productName}${draft.variantLabel ? ` (${draft.variantLabel})` : ""} × ${draft.quantity} — ${money(subtotal)}`,
    `• ${say(locale, "Хүргэлт", "Delivery")}: ${money(context.deliveryFee)}`,
    `• ${say(locale, "Нийт", "Total")}: ${money(total)}`,
    `• ${say(locale, "Нэр", "Name")}: ${draft.name}`,
    `• ${say(locale, "Утас", "Phone")}: ${draft.phone}`,
    `• ${say(locale, "Хаяг", "Address")}: ${place}${draft.address ? ` — ${draft.address}` : ""}`,
    `• ${say(locale, "Төлбөр: дансаар шилжүүлнэ (24 цагийн дотор)", "Payment: bank transfer within 24 hours")}`,
    "",
    say(locale, "Баталгаажуулах уу? «Тийм» гэж бичнэ үү. Засах бол зөв мэдээллээ бичээрэй, болих бол «үгүй».", "Confirm? Reply \"yes\". To change something, write the correct details; reply \"no\" to cancel."),
  ].join("\n");
}

function createdReply(result: { orderNumber: string; totalPrice: number }, context: CatalogueContext): string {
  const locale = context.locale;
  return [
    say(locale, `Захиалга бүртгэгдлээ: №${result.orderNumber}`, `Order received: #${result.orderNumber}`),
    say(locale, `Нийт: ${money(result.totalPrice)}`, `Total: ${money(result.totalPrice)}`),
    say(locale, "Дансаар шилжүүлэх:", "Bank transfer:"),
    `${context.store.bank.name}\n${context.store.bank.holder}\n${context.store.bank.account}`,
    say(locale, `Гүйлгээний утга: ${result.orderNumber}`, `Payment reference: ${result.orderNumber}`),
    say(locale, "24 цагийн дотор төлбөр хийгээгүй бол захиалга автоматаар цуцлагдана. Төлбөр орсны дараа ажилтан шалгаж баталгаажуулаад хүргэлтэд гаргана.", "Unpaid orders are cancelled after 24 hours. Once the transfer arrives, our team confirms it and ships your order."),
    say(locale, `Захиалгаа шалгах: ${context.site}/${locale}/order-status`, `Check your order: ${context.site}/${locale}/order-status`),
  ].join("\n");
}

export type PurchaseOutcome = {
  text: string; intent: string; productIds: string[]; patch: ConversationState; events: string[];
  needsHuman?: boolean; handoffReason?: HandoffReason;
};

type PurchaseInput = {
  text: string; context: CatalogueContext; state: ConversationState; conversationId: string;
  placeOrder: PlaceChatOrder | null;
  /** Products this turn resolved on its own (the named product, the one in focus, the last numbered list). */
  namedProduct: CatalogProduct | null; focusedProduct: CatalogProduct | null; pendingProducts: CatalogProduct[];
  /** The message named a product word that fits several products ("харандаа": two pencils). */
  ambiguousProducts?: CatalogProduct[];
  /** The understanding model read a purchase intent (used after routing when no pattern matched). */
  modelSaysBuy?: boolean;
  now?: number;
};

const draftPatch = (draft: OrderDraft | null, extra: ConversationState = {}): ConversationState => ({ orderDraft: draft, ...extra });
const focusPatch = (product: CatalogProduct, variantLabel: string | null) => ({
  productSelection: { selection: { productId: product.id, variantId: variantLabel ? product.sizes.find((size) => size.label === variantLabel)?.id ?? null : null }, updatedAt: Date.now() },
  clarification: null,
});

/** Starts (or restarts) a purchase for a product. */
function startPurchase(input: PurchaseInput, product: CatalogProduct | null, quantity: number, variantLabel: string | null, events: string[] = ["purchase_intent"]): PurchaseOutcome {
  const { context } = input;
  const locale = context.locale;
  const now = input.now ?? Date.now();
  if (!product) {
    const options = context.products.slice(0, 8);
    return {
      intent: "purchase", productIds: options.map((item) => item.id), events,
      text: [say(locale, "Аль бүтээгдэхүүнийг авах вэ?", "Which product would you like?"), ...options.map((item, index) => `${index + 1}) ${item.productName} — ${money(item.price)}`)].join("\n"),
      patch: draftPatch({ step: "pick_product", quantity, updatedAt: now }, { clarification: { candidateProductIds: options.map((item) => item.id), createdAt: now }, productSelection: null }),
    };
  }
  let variant = variantLabel ? product.sizes.find((size) => size.label === variantLabel) ?? null : null;
  if (!variant && product.sizes.length === 1) variant = product.sizes[0];
  if (product.sizes.length > 1 && !variant) {
    return { intent: "purchase", productIds: [product.id], events, text: variantPrompt(product, context, `${product.productName} — ${money(product.price)}`),
      patch: draftPatch({ step: "pick_variant", productId: product.id, quantity, updatedAt: now }, focusPatch(product, null)) };
  }
  const draft: OrderDraft = { step: "offer", productId: product.id, variantLabel: variant?.label ?? null, quantity, updatedAt: now };
  return offerOutcome(input, product, draft, events);
}

function offerOutcome(input: PurchaseInput, product: CatalogProduct, draft: OrderDraft, events: string[]): PurchaseOutcome {
  const { context } = input;
  const locale = context.locale;
  const variant = draft.variantLabel ? product.sizes.find((size) => size.label === draft.variantLabel) ?? null : null;
  const level = variant ? stockLevel(variant, context.settings.lowStockThreshold) : "untracked";
  if (variant && level === "soldout") {
    return { intent: "purchase", productIds: [product.id], events, text: soldOutVariantReply(product, variant, context),
      patch: draftPatch({ ...draft, step: "pick_variant", variantLabel: null }, focusPatch(product, null)) };
  }
  if (variant && variant.stock !== null && variant.stock < draft.quantity) {
    const label = stockLabel(level, locale);
    return { intent: "purchase", productIds: [product.id], events,
      text: [`${product.productName}: ${variant.label} — ${label}.`,
        say(locale, "Энэ тоогоор нөөц хүрэлцэхгүй байна. Цөөн тоогоор захиалах эсвэл ажилтнаас нөөцийг лавлана уу:", "We do not have that many in stock. Order fewer, or ask our team about restocking:"),
        [context.store.contact.phone, context.store.contact.email].filter(Boolean).join(" · ")].join("\n"),
      patch: draftPatch({ ...draft, step: "offer" }, focusPatch(product, variant.label)) };
  }
  return { intent: "purchase", productIds: [product.id], events: [...events, "checkout_link"], text: offerReply(product, draft, context),
    patch: draftPatch({ ...draft, step: "offer" }, focusPatch(product, draft.variantLabel ?? null)) };
}

function contactPrompt(input: PurchaseInput, product: CatalogProduct, draft: OrderDraft): PurchaseOutcome {
  const { context } = input;
  const locale = context.locale;
  if (context.settings.chatOrdersEnabled === false) {
    return { intent: "purchase", productIds: [product.id], events: ["checkout_link"],
      text: [say(locale, "Чатаар захиалга авах боломжгүй байна. Доорх холбоосоор захиалаарай (QPay эсвэл дансаар төлнө):", "Chat orders are not available right now. Please order with this link (QPay or bank transfer):"), buyLink(product, draft.variantLabel || null, draft.quantity, context)].join("\n"),
      patch: draftPatch({ ...draft, step: "offer" }) };
  }
  return { intent: "chat_order", productIds: [product.id], events: ["chat_order_started"],
    text: say(locale, "За, чатаар захиалъя. Нэр, утасны дугаараа бичнэ үү (жишээ: Бат 99001122).", "Sure. Please write your name and phone number (for example: Bat 99001122)."),
    patch: draftPatch({ ...draft, step: "contact", updatedAt: input.now ?? Date.now() }) };
}

function addressPrompt(input: PurchaseInput, product: CatalogProduct, draft: OrderDraft): PurchaseOutcome {
  const locale = input.context.locale;
  return { intent: "chat_order", productIds: [product.id], events: [],
    text: say(locale, "Хүргэлтийн хаягаа бичнэ үү: дүүрэг, хороо, байр, тоот (орон нутаг бол аймаг, сум, хаяг).", "Please write the delivery address: district, khoroo, building and apartment (or aimag, sum and address outside the city)."),
    patch: draftPatch({ ...draft, step: "address", updatedAt: input.now ?? Date.now() }) };
}

function cancelOutcome(input: PurchaseInput, productIds: string[]): PurchaseOutcome {
  return { intent: "purchase_cancelled", productIds, events: ["chat_order_cancelled"], patch: draftPatch(null),
    text: say(input.context.locale, "Захиалгыг цуцаллаа. Дараа хүссэн үедээ дахин захиалж болно.", "The order was cancelled. You can order again any time.") };
}

async function createOrder(input: PurchaseInput, product: CatalogProduct, draft: OrderDraft): Promise<PurchaseOutcome> {
  const { context } = input;
  const locale = context.locale;
  if (!input.placeOrder || context.settings.chatOrdersEnabled === false) return contactPrompt(input, product, draft);
  const unitPrice = unitPriceOf(product, draft.variantLabel || null);
  const request: ChatOrderRequest = {
    conversationId: input.conversationId, locale,
    items: [{ productId: product.id, productName: product.productName, size: draft.variantLabel || null, quantity: draft.quantity, unitPrice }],
    name: draft.name || "", phone: draft.phone || "", zone: draft.zone || "UB", city: draft.city || "Улаанбаатар", district: draft.district || "", khoroo: draft.khoroo || "-", address: draft.address || "",
    idempotencyKey: `chat:${input.conversationId}:${draft.updatedAt}`,
  };
  try {
    const result = await input.placeOrder(request);
    return { intent: "chat_order_created", productIds: [product.id], events: ["chat_order_created"], text: createdReply(result, context), patch: draftPatch(null, { lastOrderNumber: result.orderNumber }) };
  } catch (error) {
    const code = (error as { code?: string })?.code || "";
    if (code === "OUT_OF_STOCK" || code === "INVALID_SIZE") {
      return { intent: "chat_order_failed", productIds: [product.id], events: ["chat_order_failed"], patch: draftPatch(null),
        text: say(locale, "Уучлаарай, энэ сонголтын нөөц дөнгөж дууссан тул захиалга үүсгэж чадсангүй. Өөр сонголт авах бол бичээрэй, эсвэл ажилтнаас лавлана уу.", "Sorry, that option just sold out, so the order could not be created. Tell me if you would like another option, or ask our team.") };
    }
    if (code === "PRICE_CHANGED") {
      return { ...offerOutcome(input, product, { ...draft, step: "offer", updatedAt: input.now ?? Date.now() }, ["chat_order_failed"]),
        text: [say(locale, "Үнэ өөрчлөгдсөн тул шинэ дүнг харуулъя:", "The price changed; here is the updated total:"), offerReply(product, draft, context)].join("\n") };
    }
    return { intent: "chat_order_failed", productIds: [product.id], events: ["chat_order_failed"], needsHuman: true, handoffReason: "order_problem", patch: draftPatch(null),
      text: [say(locale, "Уучлаарай, захиалгыг одоо үүсгэж чадсангүй. Доорх холбоосоор захиалах эсвэл ажилтантай холбогдоно уу:", "Sorry, the order could not be created right now. Please order with this link or contact our team:"), buyLink(product, draft.variantLabel || null, draft.quantity, context), [context.store.contact.phone, context.store.contact.email].filter(Boolean).join(" · ")].join("\n") };
  }
}

function looksLikeAddress(text: string): boolean {
  return Boolean(parseDistrict(text)) || /хороо|байр|тоот|гудамж|хаяг|хотхон|аймаг|сум\b|horoo|bair|toot|hayag|street|apartment|building/iu.test(text);
}

/** Continues an active draft with this message; null means the message was not about the draft. */
async function continueDraft(input: PurchaseInput, draft: OrderDraft): Promise<PurchaseOutcome | null> {
  const { text, context } = input;
  const locale = context.locale;
  const probe = intentProbe(text);
  const now = input.now ?? Date.now();
  const product = draft.productId ? context.products.find((item) => item.id === draft.productId) ?? null : null;
  if (draft.step !== "pick_product" && !product) return null;
  const isNo = NO.test(probe.split("\n")[0]) || NO.test(probe);
  const isYes = YES.test(text);
  // A new product named with purchase intent restarts the purchase (handled by the caller).
  if (BUY_INTENT.test(probe) && ((input.namedProduct && input.namedProduct.id !== draft.productId) || input.ambiguousProducts?.length)) return null;

  if (draft.step === "pick_product") {
    if (isNo) return cancelOutcome(input, []);
    const picked = input.namedProduct;
    if (!picked) return null;
    return startPurchase(input, picked, parseQuantity(text) ?? draft.quantity, product ? null : matchVariant(text, picked)?.label ?? null, []);
  }
  if (!product) return null;

  const quantity = parseQuantity(text);
  const variant = matchVariant(text, product, draft.step === "pick_variant");
  if (draft.step === "pick_variant") {
    if (isNo) return cancelOutcome(input, [product.id]);
    if (!variant) return null;
    return offerOutcome(input, product, { ...draft, variantLabel: variant.label, quantity: quantity ?? draft.quantity, updatedAt: now }, []);
  }
  if (draft.step === "offer") {
    if (isNo) return cancelOutcome(input, [product.id]);
    if (CHAT_ORDER_HERE.test(probe)) return contactPrompt(input, product, { ...draft, updatedAt: now });
    if (variant || quantity) return offerOutcome(input, product, { ...draft, variantLabel: variant?.label ?? draft.variantLabel, quantity: quantity ?? draft.quantity, updatedAt: now }, []);
    if (isYes) return { intent: "purchase", productIds: [product.id], events: [], patch: draftPatch({ ...draft, updatedAt: now }),
      text: say(locale, "Захиалах бол дээрх холбоосоор сайт дээр захиалаарай, эсвэл чатаар захиалах бол «энд захиалъя» гэж бичнэ үү.", "Use the link above to order on the site, or write \"order here\" to order in this chat.") };
    return null;
  }
  if (draft.step === "contact") {
    if (isNo) return cancelOutcome(input, [product.id]);
    const phone = parsePhone(text);
    const name = parseName(text, phone) || draft.name || "";
    if (!phone) {
      const digitsOnly = /\d{4,}/.test(text);
      if (digitsOnly) return { intent: "chat_order", productIds: [product.id], events: [], patch: draftPatch({ ...draft, name, updatedAt: now }),
        text: say(locale, "Утасны дугаар 8 оронтой байх ёстой (жишээ: 99001122). Нэр, утсаа дахин бичнэ үү.", "The phone number must have 8 digits (for example 99001122). Please write your name and phone again.") };
      if (name && !/[?？]/.test(text) && text.trim().split(/\s+/).length <= 3 && !BUY_INTENT.test(probe)) return { intent: "chat_order", productIds: [product.id], events: [], patch: draftPatch({ ...draft, name, updatedAt: now }),
        text: say(locale, `${name}, утасны дугаараа бас бичнэ үү (8 оронтой).`, `${name}, please add your phone number (8 digits).`) };
      return null;
    }
    if (!name) return { intent: "chat_order", productIds: [product.id], events: [], patch: draftPatch({ ...draft, phone, updatedAt: now }),
      text: say(locale, "Нэрээ бас бичнэ үү.", "Please write your name as well.") };
    return addressPrompt(input, product, { ...draft, name, phone });
  }
  if (draft.step === "address") {
    if (isNo) return cancelOutcome(input, [product.id]);
    const place = parseDistrict(text) || (draft.district ? { zone: draft.zone || "UB", city: draft.city || "Улаанбаатар", district: draft.district } : null);
    const khoroo = parseKhoroo(text) || draft.khoroo || null;
    if (!place) {
      if (!looksLikeAddress(text)) return null;
      return { intent: "chat_order", productIds: [product.id], events: [], patch: draftPatch({ ...draft, address: text.trim().slice(0, 500), updatedAt: now }),
        text: [say(locale, "Аль дүүрэг вэ?", "Which district?"), ...ULAANBAATAR_DISTRICTS.map((district, index) => `${index + 1}) ${district}`), say(locale, "Орон нутаг бол аймаг, сумаа бичнэ үү.", "Outside the city, write the aimag and sum.")].join("\n") };
    }
    const address = [draft.address, text.trim()].filter(Boolean).join(" ").slice(0, 500);
    if (place.zone === "UB" && !khoroo) {
      return { intent: "chat_order", productIds: [product.id], events: [], patch: draftPatch({ ...draft, ...place, address, updatedAt: now }),
        text: say(locale, "Хэддүгээр хороо вэ? (жишээ: 5-р хороо)", "Which khoroo? (for example: khoroo 5)") };
    }
    const next: OrderDraft = { ...draft, ...place, khoroo: place.zone === "UB" ? khoroo! : khoroo || "-", address, step: "confirm", updatedAt: now };
    return { intent: "chat_order", productIds: [product.id], events: ["chat_order_summary"], text: confirmReply(product, next, context), patch: draftPatch(next) };
  }
  if (draft.step === "confirm") {
    if (isYes) return createOrder(input, product, draft);
    if (isNo) return cancelOutcome(input, [product.id]);
    if (variant || quantity) {
      const next: OrderDraft = { ...draft, variantLabel: variant?.label ?? draft.variantLabel, quantity: quantity ?? draft.quantity, updatedAt: now };
      const check = offerOutcome(input, product, next, []);
      if (!check.events.includes("checkout_link")) return check;
      return { intent: "chat_order", productIds: [product.id], events: ["chat_order_summary"], text: confirmReply(product, { ...next, step: "confirm" }, context), patch: draftPatch({ ...next, step: "confirm" }) };
    }
    const phone = parsePhone(text);
    const place = parseDistrict(text);
    if (phone || place) {
      const next: OrderDraft = { ...draft, ...(phone ? { phone, name: parseName(text, phone) || draft.name } : {}), ...(place ? { ...place, khoroo: parseKhoroo(text) || (place.zone === "UB" ? draft.khoroo : "-"), address: text.trim().slice(0, 500) } : {}), updatedAt: now };
      return { intent: "chat_order", productIds: [product.id], events: ["chat_order_summary"], text: confirmReply(product, next, context), patch: draftPatch(next) };
    }
    return null;
  }
  return null;
}

/** The purchase layer of a turn: continues a draft, or starts one on purchase intent. Null = not a purchase turn. */
export async function purchaseTurn(input: PurchaseInput): Promise<PurchaseOutcome | null> {
  const { text, context } = input;
  const probe = intentProbe(text);
  const now = input.now ?? Date.now();
  const draft = readDraft(input.state, now);
  if (draft) {
    const continued = await continueDraft(input, draft);
    if (continued) return continued;
  }
  const wantsBuy = BUY_INTENT.test(probe) || Boolean(input.modelSaysBuy);
  const wantsHere = CHAT_ORDER_HERE.test(probe);
  if (!wantsBuy && !wantsHere) return null;
  const quantity = parseQuantity(text) ?? draft?.quantity ?? 1;
  const ambiguous = input.ambiguousProducts || [];
  // A word that fits several products ("харандаа") asks which one; it never falls back to the product in focus.
  const product = input.namedProduct || (ambiguous.length ? null : (input.pendingProducts.length === 1 ? input.pendingProducts[0] : null) || input.focusedProduct || null);
  const variant = product ? matchVariant(text, product)?.label ?? null : null;
  if (!product) {
    const choices = ambiguous.length > 1 ? ambiguous : input.pendingProducts;
    if (choices.length > 1) {
      return { intent: "purchase", productIds: choices.map((item) => item.id), events: ["purchase_intent"],
        text: [say(context.locale, "Аль нь вэ?", "Which one?"), ...choices.map((item, index) => `${index + 1}) ${item.productName} — ${money(item.price)}`)].join("\n"),
        patch: draftPatch({ step: "pick_product", quantity, updatedAt: now }, { clarification: { candidateProductIds: choices.map((item) => item.id), createdAt: now }, productSelection: null }) };
    }
    return startPurchase(input, null, quantity, null);
  }
  if (wantsHere && !wantsBuy) {
    const started = startPurchase(input, product, quantity, variant);
    const nextDraft = readDraft(started.patch, now);
    if (nextDraft?.step === "offer") return contactPrompt(input, product, nextDraft);
    return started;
  }
  return startPurchase(input, product, quantity, variant);
}

/** Pure helpers for tests and the analytics: the total a draft would be charged. */
export function draftTotal(product: CatalogProduct, draft: Pick<OrderDraft, "variantLabel" | "quantity">, context: CatalogueContext): { unit: number; subtotal: number; total: number } {
  const unit = unitPriceOf(product, draft.variantLabel || null);
  return { unit, subtotal: unit * draft.quantity, total: unit * draft.quantity + context.deliveryFee };
}

export { productLink };
