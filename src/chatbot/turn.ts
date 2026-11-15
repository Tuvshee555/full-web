/**
 * One customer turn → one reply, with no database access (state, history, catalogue and the
 * model/order functions are passed in), so the whole conversation flow is testable.
 * Order ported from Uudam's webhook.ts (see handler.ts for the persistence around it):
 *   layer 0:   payment claim (MUST stay first) → human request → order credentials → contact capture
 *              → thanks / greeting
 *   layer 0.5: the purchase layer (commerce/purchase.ts): an active chat order draft, or purchase
 *              intent ("авъя", "order it") → stock check, server-priced summary, checkout link
 *   layer 1:   keyword fast paths (safety, growth, delivery, payment, bank, returns, contact, about,
 *              the owner's shop FAQ) → product routing with numbered "which one?" memory
 *              → deterministic product answer (prices, variants, stock, volume, usage, ingredients, FAQ)
 *   layer 2:   AI writer behind the freeform verifier (recommendations, chit-chat, unknown products)
 *   fallbacks: a catalogue list or a contact line. Never silence, never REFER to the customer.
 * Every intent pattern reads the customer's text AND its normalized form (textNorm.ts), so Latin
 * spellings, glued words and slang reach the same branches as Cyrillic.
 */
import { filterCandidatesByAttribute, parseNumberedChoice, routeFastPathText, type FastPathRoute } from "./fastPathRouting";
import { understandProductMessage, notInCatalogReply, type AskJson } from "./productUnderstanding";
import { buildProductAnswerPlan } from "./productAnswerPlan";
import { buildProductRequest, type ProductTopic } from "./productRequest";
import { resolveProductFromUserMessage } from "./productSearch";
import { formatProductLine } from "./productPriceBlock";
import { composeReply, contactFallback } from "./reply";
import { presentAssistantReply } from "./chatbotReplyPolicy";
import { isFrustratedHandoffRequest } from "./handoffDetection";
import { contactDetails, orderCredentials } from "./orderHelp";
import { buildContextualUserText } from "./contextualText";
import { isKnownGreetingPhrase, isThanksOnly } from "./greetingPhrases";
import { writeProductReply, type AskReply } from "./productWriter";
import { explainFreeformReply } from "./productReplyVerification";
import { intentProbe } from "./textNorm";
import { matchFaq } from "./knowledge";
import { purchaseTurn } from "./commerce/purchase";
import { logWarn } from "./observability";
import type { CatalogProduct, CatalogueContext, ChatMessage, ConversationState, HandoffReason, Locale, PlaceChatOrder } from "./types";

export type TurnInput = {
  text: string; history: ChatMessage[]; state: ConversationState; context: CatalogueContext; senderId: string;
  askUnderstanding?: AskJson | null; askReply?: AskReply | null;
  orderLookup: (orderNumber: string, phone: string) => Promise<string | null>;
  /** Creates a confirmed chat order (bank transfer). Null: chat orders unavailable, the link is offered instead. */
  placeOrder?: PlaceChatOrder | null;
};
export type { HandoffReason } from "./types";
export type TurnOutput = {
  text: string; state: ConversationState; intent: string; needsHuman: boolean; productIds: string[]; model: string;
  handoffReason?: HandoffReason; events: string[]; leadContext?: string;
};

const say = (locale: Locale, mn: string, en: string) => (locale === "en" ? en : mn);

// Layer 0 #1 (Uudam: MUST stay first): a customer saying they paid. Never self-confirm a payment.
const PAYMENT_CLAIM = /(?:шилжүүлсэн|шилжүүлчихсэн|төлчихсөн|төлсөн|мөнгөө\s+(?:хийсэн|шилжүүлсэн)|i\s+(?:have\s+)?(?:paid|transferred)|payment\s+(?:sent|made|done))/iu;
const PAYMENT_QUESTION = /(?:яаж|хаана|хэрхэн|how|where|can\s+i|болох\s+уу|боломжтой\s+юу)/iu;
// Explicit human requests and complaints (Uudam handoffDetection + shop complaints).
const HUMAN_REQUEST = /(?:хүнтэй|хүн\s+(?:холбогд|ярь|ярих|хэрэгтэй|байгаа\s*юу|байна\s*уу|алга)|ажилтан(?:тай)?\s*(?:холбо|ярь|ярих|хэрэгтэй|байгаа|байна)|ажилтантай|оператор|ярих\s+хүн|хүн\s+(?:байгаа|байна)\s+(?:юу|уу)|жинхэнэ\s+хүн|(?:чатбот|робот|бот)\s+биш|холбож\s+өг|менежер|хүн\s+хариул|human|operator|real\s+person|someone\s+to\s+talk|talk\s+to\s+(?:a\s+)?(?:person|human|someone)|staff\s+member|not\s+a\s+bot|live\s+agent)/iu;
const COMPLAINT = /(?:гомдол|эвдэрсэн|эвдэрч|гэмтэлтэй|гэмтсэн|буруу\s+(?:бараа|бүтээгдэхүүн|өнгө).{0,20}ир|мөнгө(?:ө)?\s+буцаа|complain|damaged|broken|wrong\s+(?:item|product|colou?r)|refund)/iu;
const HOW_TO_ORDER = /(?:(?:яаж|хэрхэн)\s+(?:\S+\s+)?(?:захиал|авах)|захиалах\s+(?:вэ|уу)|how\s+(?:do|can|to)\s+(?:i\s+)?(?:order|buy|purchase))/iu;
const ORDER_TALK = /(?:захиалга|захиалсан|захиалгын|ирэхгүй|ирээгүй|хүргэгдээгүй|хаана\s+явна|\border\b|hasn'?t\s+(?:arrived|come)|not\s+(?:arrived|delivered)|where\s+is\s+my)/iu;
const ORDER_COMPLAINT_AGAIN = /(?:ирэхгүй|ирээгүй|гомдол|удаж|hasn'?t|not\s+arrived|still|late)/iu;
const CONTACT_ONLY = /^[\p{L}\s.,:'-]{0,60}(?:\+?976[ -]?)?\d{4}[ -]?\d{4}[\p{L}\s.,!]{0,40}$/u;
const GROWTH = /(?:ургуул|ургах|ургана|ургадаг|урга(?:лт|на)|үс\s+ург|өтгөр(?:үүл|өх)|эмчил|үр\s*дүн|regrow|grow\s+(?:back|my|in)|hair\s+growth|thicker\s+brows|make\s+(?:my\s+)?brows\s+(?:grow|thicker)|results?\s+(?:in|after|take)|when\s+(?:will|do)\s+i\s+see)/iu;
const SAFETY = /(?:харшил|жирэмсэн|хөхүүл|аюулгүй\s+юу|гаж\s+нөлөө|улай|загатн|хавд|цочир|нүд(?:энд|эндээ|\s*р[үу]у)?\s*(?:ор|хүр)|allerg|pregnan|breastfeed|is\s+it\s+safe|side\s+effect|sensitive\s+skin|rash|irritat|redness|itch|(?:in|into)\s+(?:my\s+)?eyes?|eye\s+contact)/iu;
const CATALOG = /(?:ямар\s+(?:бүтээгдэхүүн|бараа)|бүтээгдэхүүнүүд|юу\s+(?:зардаг|байна\s+вэ)|бүх\s+бүтээгдэхүүн|нимгэн|сийрэг|what\s+do\s+you\s+(?:sell|have)|list\s+(?:your\s+|all\s+)?products|all\s+products|your\s+products|sparse|thin\s+brows|recommend)/iu;
const ASKS_IF_SOLD = /(?:байгаа\s+(?:юу|уу)|байна\s+уу|зардаг\s+уу|do\s+you\s+(?:sell|have)|is\s+there)/iu;
// "hed hongiin dotor irhe ve", "hezee irh ve", "Ulaangom ruu yvuulj boloh uu": the delivery policy, never a product card.
const DELIVERY_TIME = /(?:(?:хэдэн|хэд|хэр)\s+(?:хоног|өдөр|удаан|хугацаа)|хоног(?:ийн)?\s+дотор|хэзээ\s+(?:ирэх|ирнэ|ирж|хүрэх|хүрнэ|авах|авч|очих)|(?:ирэх|хүрэх)\s+(?:вэ|уу|бол)|явуул|илгээ|хүргэж\s+өг|how\s+(?:many\s+days|long\s+(?:does|will|until|is)\s+(?:the\s+)?(?:delivery|shipping|it\s+take))|when\s+(?:will|does|would|can)\s+(?:it|my\s+(?:order|stuff|package|parcel|items?)|the\s+order|i\s+get)\s*(?:arrive|come|get|be\s+delivered|it)?|delivery\s+time|ship\s+to|send\s+(?:it\s+)?to|deliver\s+to)/iu;
const USAGE_WORDS = /(?:хэрэгл|түрх|ууж|use|apply|wear)/iu;
// "ymar buteegdehuun zardag ve": the numbered catalogue from the rules (a model-written list has no numbers, so "the second one" would not resolve).
const CATALOG_LIST = /(?:ямар\s+(?:бүтээгдэхүүн|бараа|зүйл)|бүтээгдэхүүнүүд|юу\s+(?:зардаг|байна\s+вэ|байгаа\s+вэ|байдаг)|юу\s+юу\s+(?:байна|байгаа|зардаг)|бүх\s+бүтээгдэхүүн|what\s+do\s+you\s+(?:sell|have|offer)|list\s+(?:your\s+|all\s+)?products|all\s+products|your\s+products|show\s+me\s+(?:everything|all|the\s+products)|product\s+list|catalogu?e)/iu;
const RECOMMEND = /(?:тохир|зөвлө|санал\s+болго|нимгэн|сийрэг|recommend|suit|best\s+for|sparse|thin\s+brows|beginner|which\s+(?:one\s+)?(?:is\s+)?(?:better|best))/iu;
// "serumiig hed sar hereglevel deer ve": how long to use is a product usage question, not a growth claim.
const DURATION_OF_USE = /(?:хэдэн\s+(?:сар|долоо\s*хоног|өдөр|хоног)|хэд\s+(?:сар|хоног|долоо)|хэр\s+удаан|хэдий\s+(?:хугацаа|удаан)|хугацаа(?:нд|ны)?\s+(?:хэрэгл|түрх)|how\s+(?:long|many\s+(?:weeks|months|days))|(?:weeks|months)\s+(?:of\s+use|to\s+use))/iu;
const RULE_TOPICS: Array<[string, RegExp]> = [
  ["bank", /(?:данс|банк|bank|account\s+number)/iu],
  ["delivery", /(?:хүргэлт|хүргэх|хүргүүл|хүргэдэг|хүргэ|deliver|shipping)/iu],
  ["payment", /(?:qpay|карт|card|төлбөр(?:өө)?\s+(?:яаж|хэрхэн)|яаж\s+төл|хэрхэн\s+төл|how\s+(?:can|do)\s+i\s+pay|payment\s+method|pay\s+(?:by|with))/iu],
  ["returns", /(?:буцаа(?:х|ж)|буцаалт|солиул|солих|сольж|солиж|return\s+(?:policy|it|the)|exchange)/iu],
  ["contact", /(?:холбоо\s+барих|хаяг\s+(?:хаана|юу)|утасны\s+дугаар\s+(?:хэд|юу)|\bcontact\b|your\s+(?:phone|address)|where\s+are\s+you\s+located)/iu],
  ["about", /(?:та\s+нар\s+хэн|компанийн\s+тухай|about\s+(?:you|your\s+(?:shop|company|brand))|who\s+are\s+you)/iu],
];

function ruleTopic(probe: string): string | null {
  // How long delivery takes, whether we ship to a place: the delivery policy (unless it is about using the product).
  if (DELIVERY_TIME.test(probe) && !USAGE_WORDS.test(probe)) return "delivery";
  for (const [topic, pattern] of RULE_TOPICS) if (pattern.test(probe)) return topic;
  return null;
}

/** Products named in a reply, in the order the customer read them (so "3" means the third one shown). */
function mentionedProducts(text: string, products: CatalogProduct[]): CatalogProduct[] {
  return products
    .filter((product) => product.productName && text.includes(product.productName))
    .sort((a, b) => text.indexOf(a.productName) - text.indexOf(b.productName));
}

/** Numbered list + remembered candidates, so "1" / "the first one" / "эхнийх нь" resolves next turn. */
function listProducts(products: CatalogProduct[], context: CatalogueContext, heading: string) {
  const options = products.slice(0, 5);
  return {
    text: [heading, ...options.map((product, index) => `${index + 1}) ${formatProductLine(product, context)}`),
      ...(products.length > options.length ? [context.locale === "en"
        ? `We have ${products.length} products in total. See them all: ${context.site}/en`
        : `Нийт ${products.length} бүтээгдэхүүн бий. Бүгдийг сайтаас үзээрэй: ${context.site}/mn`] : [])].join("\n"),
    productIds: options.map((product) => product.id),
    patch: { clarification: { candidateProductIds: options.map((product) => product.id), createdAt: Date.now() }, productSelection: null },
  };
}

/** What the conversation established, written on the lead so staff can act without reading the chat. */
function leadContextOf(history: ChatMessage[], text: string, focused: CatalogProduct | null, locale: Locale): string {
  const lines: string[] = [];
  if (focused) lines.push(`${say(locale, "Сонирхсон бүтээгдэхүүн", "Product of interest")}: ${focused.productName}`);
  const asked = [...history.filter((turn) => turn.role === "user").map((turn) => turn.text), text]
    .map((value) => value.replace(/\s+/g, " ").trim()).filter((value) => value && !/^[\d\s+()-]{8,}$/.test(value)).slice(-4);
  if (asked.length) lines.push(`${say(locale, "Сүүлийн мессежүүд", "Last messages")}: ${asked.map((value) => value.slice(0, 120)).join(" / ")}`);
  return lines.join("\n");
}

export async function runCustomerTurn(input: TurnInput): Promise<TurnOutput> {
  const { text, history, context } = input;
  const locale = context.locale;
  const probe = intentProbe(text);
  const state: ConversationState = { ...input.state };
  const handedOff = Boolean(state.handoffAt);
  const hasPriorUserTurn = history.some((message) => message.role === "user");
  const focusedProduct = (() => {
    const id = (state.productSelection as { selection?: { productId?: string } } | null)?.selection?.productId;
    return id ? context.products.find((product) => product.id === id) ?? null : null;
  })();
  const done = (out: { text: string; intent: string; needsHuman?: boolean; productIds?: string[]; patch?: ConversationState; model?: string; handoffReason?: HandoffReason; events?: string[] }): TurnOutput => {
    const hasPriorReply = history.some((message) => message.role === "assistant");
    let reply = presentAssistantReply({ reply: out.text, userText: text, hasPriorReply, phoneAlreadyRequested: handedOff });
    if (!reply.trim() || /^(?:REFER|SILENT)\b/i.test(reply.trim())) reply = contactFallback(context);
    const nextState: ConversationState = { ...state, ...(out.patch || {}), lastIntent: out.intent };
    if (out.needsHuman && !nextState.handoffAt) nextState.handoffAt = Date.now();
    const needsHuman = Boolean(out.needsHuman);
    return {
      text: reply, state: nextState, intent: out.intent, needsHuman, productIds: out.productIds || [], model: out.model || "rules",
      ...(needsHuman ? { handoffReason: out.handoffReason || "customer_request", leadContext: leadContextOf(history, text, focusedProduct, locale) } : {}),
      events: out.events || [],
    };
  };
  const human = (handoffReason: HandoffReason = "customer_request") => done({ intent: "human", needsHuman: true, handoffReason, text: composeReply({ intent: "human", handoffAcknowledged: handedOff }, context).text });
  const writeVerified = async (focusProductIds: string[] = []) => {
    if (!input.askReply) return null;
    const written = await writeProductReply({ text, history, context, focusProductIds, customerMemory: typeof state.customerMemoryText === "string" ? state.customerMemoryText : undefined }, input.askReply);
    if (!written) return null;
    const checked = explainFreeformReply(written, context, text);
    if (!checked.ok) logWarn("writer.reply_rejected", { reason: checked.reason });
    return checked.ok ? checked.text : null;
  };
  const pendingIds = ((state.clarification as { candidateProductIds?: string[] } | null)?.candidateProductIds || []);
  const pendingProducts = pendingIds.map((id) => context.products.find((product) => product.id === id)).filter((product): product is CatalogProduct => Boolean(product));
  /** The product this message names on its own: by name, or by its number in the last list. */
  const direct = resolveProductFromUserMessage(text, context.products, { allowLooseFallback: false });
  const ambiguousProducts = direct.status === "ambiguous" ? direct.candidates : [];
  const namedProduct = (() => {
    if (direct.status === "verified") return direct.product;
    const choice = parseNumberedChoice(text);
    if (choice && pendingProducts[choice.index]) return pendingProducts[choice.index];
    if (pendingProducts.length) {
      const scoped = resolveProductFromUserMessage(text, pendingProducts, { allowLooseFallback: false });
      if (scoped.status === "verified") return scoped.product;
      const narrowed = filterCandidatesByAttribute(text, pendingProducts);
      if (narrowed.length === 1) return narrowed[0];
    }
    return null;
  })();
  const purchase = (modelSaysBuy = false, product: CatalogProduct | null = namedProduct) => purchaseTurn({
    text, context, state, conversationId: input.senderId, placeOrder: input.placeOrder ?? null,
    namedProduct: product, focusedProduct, pendingProducts, ambiguousProducts: product ? [] : ambiguousProducts, modelSaysBuy,
  });

  // ── Layer 0 ──
  if (PAYMENT_CLAIM.test(probe) && !PAYMENT_QUESTION.test(probe)) {
    return done({ intent: "payment_claim", needsHuman: true, handoffReason: "payment_claim", text: say(locale,
      "Баярлалаа. Төлбөрийг манай ажилтан шалгаж баталгаажуулна. Захиалгын дугаар болон утасны дугаараа бичвэл илүү хурдан шалгана.",
      "Thank you. Our team will check and confirm the payment. Sharing your order number and phone number helps us check faster.") });
  }
  if (COMPLAINT.test(probe)) return human("complaint");
  if (HUMAN_REQUEST.test(probe) || isFrustratedHandoffRequest(text)) return human("customer_request");

  // ── Layer 0.5: an active chat order, or a new purchase ("авъя", "захиалъя", "order it") ──
  const bought = await purchase();
  if (bought) return done({ intent: bought.intent, productIds: bought.productIds, patch: bought.patch, text: bought.text, events: bought.events, needsHuman: bought.needsHuman, handoffReason: bought.handoffReason });

  // Order help. A pending order number + a phone in this turn goes straight to the private lookup.
  const credentials = orderCredentials(text, state);
  const phoneNow = contactDetails(text).phone;
  const pendingOrder = typeof state.pendingOrderNumber === "string" && state.pendingOrderNumber ? state.pendingOrderNumber : "";
  const orderTurn = !HOW_TO_ORDER.test(probe) && (ORDER_TALK.test(probe) || Boolean(pendingOrder && phoneNow));
  if (orderTurn) {
    if (state.orderAskedAt && !credentials.orderNumber && !phoneNow && ORDER_COMPLAINT_AGAIN.test(probe) && state.lastIntent === "order") return human("order_problem");
    const status = credentials.hasOrderCredentials ? await input.orderLookup(credentials.orderNumber, credentials.phone) : null;
    return done({
      intent: "order", text: composeReply({ intent: "order", hasOrderCredentials: credentials.hasOrderCredentials, orderStatus: status }, context).text,
      patch: credentials.hasOrderCredentials
        ? { pendingOrderNumber: "", pendingOrderPhone: "", orderAskedAt: Date.now() }
        : { pendingOrderNumber: credentials.orderNumber, pendingOrderPhone: credentials.phone, orderAskedAt: Date.now() },
    });
  }
  if (handedOff && phoneNow && CONTACT_ONLY.test(text.trim())) {
    return done({ intent: "contact_capture", needsHuman: true, handoffReason: (state.handoffReason as HandoffReason) || "customer_request", text: say(locale,
      "Баярлалаа, мэдээллийг тань ажилтанд дамжууллаа. Өөр асуух зүйл байвал бичээрэй.",
      "Thank you, I've passed your details to our team. Feel free to ask anything else.") });
  }
  if (isThanksOnly(text)) return done({ intent: "thanks", text: composeReply({ intent: "thanks" }, context).text });
  if (isKnownGreetingPhrase(text)) {
    return done({ intent: "greeting", text: hasPriorUserTurn ? say(locale, "Сайн байна уу! Юугаар туслах вэ?", "Hi! How can I help?") : composeReply({ intent: "greeting" }, context).text });
  }

  // ── Layer 1: keyword fast paths (no model needed) ──
  const contactLine = [context.store.contact.phone, context.store.contact.email].filter(Boolean).join(" · ");
  if (SAFETY.test(probe)) {
    // Never give medical advice: point to the published ingredients, the FAQ's patch test and a doctor.
    const patchTest = context.policies?.safety || context.brand.faq.find((item) => /туршиж|patch|test/i.test(item.q))?.a;
    const reaction = /улай|загатн|хавд|цочир|rash|irritat|redness|itch|гаж\s+нөлөө|side\s+effect|нүд(?:энд|эндээ|\s*р[үу]у)?\s*(?:ор|хүр)|(?:in|into)\s+(?:my\s+)?eyes?/iu.test(probe);
    return done({ intent: "safety", needsHuman: reaction, handoffReason: "medical", events: ["safety_question"], text: [
      reaction
        ? say(locale, "Улайх, загатнах, хавдах зэрэг шинж илэрвэл хэрэглэхээ шууд зогсоож, усаар зайлаад эмчид хандана уу. Эмнэлгийн зөвлөгөө өгөх боломжгүй.", "If you notice redness, itching or swelling, stop using the product right away, rinse with water and see a doctor. We cannot give medical advice.")
        : say(locale, "Жирэмслэлт, хөхүүл үе, харшил зэрэг эрүүл мэндийн нөхцөлд бид баталгаатай зөвлөгөө өгөх боломжгүй. Хэрэглэхээс өмнө эмчтэйгээ зөвлөлдөж, бүтээгдэхүүний хуудаснаас найрлагыг шалгаарай.", "We can't give medical advice for pregnancy, breastfeeding, allergies or other health conditions. Please check the ingredients on the product page and ask your doctor before use."),
      ...(patchTest ? [patchTest] : []), contactLine].filter(Boolean).join("\n") });
  }
  if (GROWTH.test(probe)) {
    const reply = composeReply({ intent: "medical" }, context).text;
    return done({ intent: "medical", events: ["growth_question"], text: contactLine ? `${reply}\n${contactLine}` : reply });
  }
  if (HOW_TO_ORDER.test(probe)) {
    if (focusedProduct || namedProduct) {
      const offered = await purchase(true, namedProduct || focusedProduct);
      if (offered) return done({ intent: offered.intent, productIds: offered.productIds, patch: offered.patch, text: offered.text, events: offered.events });
    }
    return done({ intent: "payment", events: ["how_to_order"], text: [composeReply({ intent: "payment" }, context).text, say(locale, "Энд бичээд ч захиалж болно: бүтээгдэхүүнээ нэрлээд «авъя» гэж бичээрэй.", "You can also order here: name the product and write \"buy\".")].join("\n") });
  }
  const topic = ruleTopic(probe);
  if (topic) {
    const composed = composeReply({ intent: topic }, context);
    return done({ intent: topic, text: composed.text, needsHuman: composed.needsHuman, handoffReason: "unanswered" });
  }
  // The owner's own shop FAQ (opening hours, pickup, anything they wrote) answers verbatim when it fits the question.
  const shopFaq = namedProduct ? null : matchFaq(text, context.brand.faq);
  if (shopFaq && !/₮|\bMNT\b/.test(shopFaq.item.a.replace(/\d{1,3}(?:,\d{3})+₮/g, (amount) => (context.deliveryFee && amount.startsWith(context.deliveryFee.toLocaleString("en-US")) ? "" : amount)))) {
    return done({ intent: "faq", events: ["shop_faq"], text: shopFaq.item.a });
  }

  // ── Layer 1: product routing (Uudam fastPathRouting: offered candidates first, current turn first) ──
  const contextualUserText = buildContextualUserText(history, text);
  let route: FastPathRoute;
  try {
    route = await routeFastPathText({
      senderId: input.senderId, text, contextualUserText, products: context.products, state, history,
      understand: input.askUnderstanding
        ? (pendingProductIds, selection) => understandProductMessage({ text, history, products: context.products, pendingProductIds, selection, ask: input.askUnderstanding! })
        : undefined,
    });
  } catch {
    route = { matchText: text, scopedClarify: null };
  }
  // Uudam's wrong-trip guard, product edition: with a "which one?" list pending, a turn that names
  // none of the listed products (no number, no name, no colour that narrows to one) may not be
  // answered as if the customer had picked one. Ask again instead of guessing.
  const offeredIds = ((input.state.clarification as { candidateProductIds?: string[] } | null)?.candidateProductIds || []);
  const offered = offeredIds.map((id) => context.products.find((product) => product.id === id)).filter((product): product is CatalogProduct => Boolean(product));
  if (route.chosenProductId && offered.length > 1 && offered.some((product) => product.id === route.chosenProductId)
    && !parseNumberedChoice(text)
    && resolveProductFromUserMessage(text, offered, { allowLooseFallback: false }).status !== "verified"
    && filterCandidatesByAttribute(text, offered).length !== 1
    && !buildProductRequest(text, offered).variant) {
    route = { ...route, chosenProductId: undefined, scopedClarify: offered };
    state.clarification = { candidateProductIds: offered.map((product) => product.id), createdAt: Date.now() };
    state.productSelection = input.state.productSelection ?? null;
  }
  if (route.chosenProductId && ambiguousProducts.length > 1 && ambiguousProducts.some((product) => product.id === route.chosenProductId) && !parseNumberedChoice(text)) {
    const variantName = buildProductRequest(text, ambiguousProducts).variant;
    const having = variantName ? ambiguousProducts.filter((product) => product.sizes.some((size) => size.label === variantName)) : [];
    if (having.length !== 1 && filterCandidatesByAttribute(text, ambiguousProducts).length !== 1) {
      route = { ...route, chosenProductId: undefined, scopedClarify: ambiguousProducts };
      state.clarification = { candidateProductIds: ambiguousProducts.map((product) => product.id), createdAt: Date.now() };
      state.productSelection = input.state.productSelection ?? null;
    }
  }
  // routeFastPathText records selection/clarification on `state`; carry them into the next turn.
  const routed = { productSelection: state.productSelection ?? null, clarification: state.clarification ?? null };
  const intent = route.understanding?.intent;

  if (intent === "buy") {
    const chosen = route.chosenProductId ? context.products.find((product) => product.id === route.chosenProductId) ?? null : null;
    const offeredPurchase = await purchase(true, chosen || namedProduct);
    if (offeredPurchase) return done({ intent: offeredPurchase.intent, productIds: offeredPurchase.productIds, patch: { ...routed, ...offeredPurchase.patch }, text: offeredPurchase.text, events: offeredPurchase.events });
  }
  if (intent === "human") return done({ intent: "human", needsHuman: true, handoffReason: "customer_request", patch: routed, text: composeReply({ intent: "human", handoffAcknowledged: handedOff }, context).text });
  if (intent === "order") return done({ intent: "order", patch: { ...routed, orderAskedAt: Date.now() }, text: composeReply({ intent: "order", hasOrderCredentials: false }, context).text });
  const usageDuration = DURATION_OF_USE.test(probe) && Boolean(route.chosenProductId || route.scopedClarify?.length || route.understanding?.products.length || focusedProduct || namedProduct);
  if (intent === "medical" && !usageDuration) {
    const reply = composeReply({ intent: "medical" }, context).text;
    return done({ intent: "medical", patch: routed, events: ["growth_question"], text: contactLine ? `${reply}\n${contactLine}` : reply });
  }
  if (intent && ["delivery", "payment", "bank", "returns", "about", "contact"].includes(intent) && !route.chosenProductId && !route.scopedClarify?.length) {
    const composed = composeReply({ intent }, context);
    return done({ intent, patch: routed, text: composed.text, needsHuman: composed.needsHuman, handoffReason: "unanswered" });
  }
  if (route.notInCatalog) {
    const written = await writeVerified();
    return done({ intent: "outside", patch: routed, events: ["not_in_catalogue"], text: written || notInCatalogReply(route.notInCatalog, locale), model: written ? "writer" : "rules" });
  }
  const namesNothing = resolveProductFromUserMessage(text, context.products, { allowLooseFallback: false }).status === "not_found";
  // "What do you sell?" is answered with the numbered catalogue before the writer gets a turn.
  if (namesNothing && !route.chosenProductId && !RECOMMEND.test(probe) && (CATALOG_LIST.test(probe) || (intent === "catalog" && !route.scopedClarify?.length && !route.understanding?.products.length))) {
    const list = listProducts(context.products, context, say(locale, "Манай бүтээгдэхүүнүүд:", "Our products:"));
    return done({ intent: "catalog", productIds: list.productIds, patch: { ...routed, ...list.patch }, text: list.text });
  }

  // Deterministic product answer (Uudam's structured answer): one product, or a numbered choice list.
  const pendingTopics = Array.isArray(state.pendingTopics) ? state.pendingTopics as ProductTopic[] : [];
  const askedTopics = buildProductRequest(text, context.products, route.understanding).topics;
  const answerFor = (productRoute: FastPathRoute) => buildProductAnswerPlan({ text, context, route: productRoute, pendingTopics });
  // A clarifying list remembers what was asked, so the customer's pick answers that question.
  const topicMemory = (status: string) => status === "clarify" ? { pendingTopics: askedTopics } : { pendingTopics: [] };
  const unpublishedEvents = (plan: { unpublished: ProductTopic[] }) => plan.unpublished.map((topic) => `unpublished_fact:${topic}`);
  // "Which is the cheapest?": computed from the catalogue, never guessed.
  if (askedTopics.includes("budget") && /хамгийн\s+хямд|cheapest|lowest\s+price/iu.test(probe)) {
    const pool = route.scopedClarify?.length && !/бүх|all/iu.test(probe) ? route.scopedClarify : context.products;
    const cheapest = [...pool].sort((a, b) => a.price - b.price)[0];
    if (cheapest) return done({ intent: "product", productIds: [cheapest.id],
      patch: { ...routed, productSelection: { selection: { productId: cheapest.id, variantId: null }, updatedAt: Date.now() }, clarification: null, pendingTopics: [] },
      text: [say(locale, "Хамгийн хямд нь:", "The cheapest is:"), formatProductLine(cheapest, context)].join("\n") });
  }
  // Open questions about a product (what's in it, differences, which is better) go to the writer,
  // which answers from the description; the deterministic plan only knows price/stock/usage sections.
  const openQuestion = /(?:юу\s+юу|юутай|юунаас|ямар\s+ялгаа|ялгаа(?:тай)?|аль\s+нь\s+(?:дээр|сайн|илүү)|тухай|талаар|what(?:'s|\s+is)\s+in|difference|compare|which\s+(?:one\s+)?is\s+better|better\s+for|tell\s+me\s+about|what\s+is\s+it)/iu.test(probe);
  if (input.askReply && (openQuestion || askedTopics.includes("comparison")) && (route.chosenProductId || route.scopedClarify?.length || route.understanding?.products.length)) {
    const focusIds = route.chosenProductId ? [route.chosenProductId] : (route.scopedClarify?.length ? route.scopedClarify : route.understanding?.products || []).map((product) => product.id);
    const answer = await writeVerified(focusIds);
    if (answer) return done({ intent: "product", productIds: focusIds, patch: { ...routed, pendingTopics: [] }, text: answer, model: "writer" });
  }
  const resolvedSeveral = !route.chosenProductId && !route.scopedClarify?.length && intent === "product" && (route.understanding?.products.length || 0) > 1;
  const plan = route.chosenProductId || route.scopedClarify?.length || resolvedSeveral ? answerFor(route) : null;
  if (plan && plan.status !== "handoff") return done({ intent: plan.status === "clarify" ? "clarify" : "product", productIds: plan.productIds, patch: { ...routed, ...topicMemory(plan.status) }, text: plan.reply, events: unpublishedEvents(plan) });
  // A follow-up that names nothing ("how much is it?") is about the product already in focus.
  const focused = (state.productSelection as { selection?: { productId?: string } } | null)?.selection?.productId;
  if (!plan && focused && namesNothing && askedTopics.length && context.products.some((product) => product.id === focused) && !route.understanding?.products.length) {
    const focusedPlan = answerFor({ matchText: text, scopedClarify: null, chosenProductId: focused });
    if (focusedPlan && focusedPlan.status !== "handoff") return done({ intent: "product", productIds: focusedPlan.productIds, patch: { ...routed, pendingTopics: [] }, text: focusedPlan.reply, events: unpublishedEvents(focusedPlan) });
  }

  if (!plan && namesNothing && !focused && askedTopics.length && !openQuestion && !RECOMMEND.test(probe) && !(route.understanding?.products.length && route.understanding.products.length < context.products.length)) {
    const list = listProducts(context.products, context, say(locale, "Аль бүтээгдэхүүний талаар асууж байна вэ?", "Which product do you mean?"));
    return done({ intent: "clarify", productIds: list.productIds, patch: { ...routed, ...list.patch, pendingTopics: askedTopics }, text: list.text });
  }

  // ── Layer 2: the AI writer (recommendations, chit-chat, knowledge, unanswered details) ──
  const focus = plan?.productIds || route.understanding?.products.map((product) => product.id) || [];
  const written = await writeVerified(focus);
  if (written) {
    // Remember what the reply offered, so "how do I use it?" / "the first one" resolves next turn.
    const offeredNow = mentionedProducts(written, context.products);
    const memory = offeredNow.length > 1
      ? { clarification: { candidateProductIds: offeredNow.map((product) => product.id), createdAt: Date.now() } }
      : offeredNow.length === 1 ? { productSelection: { selection: { productId: offeredNow[0].id, variantId: null }, updatedAt: Date.now() }, clarification: null } : {};
    return done({ intent: intent || "ai", productIds: offeredNow.map((product) => product.id), patch: { ...routed, ...memory }, text: written, model: "writer" });
  }

  // ── Fallbacks: still a real answer ──
  const nothingNamed = namesNothing;
  if (intent === "catalog" || (nothingNamed && CATALOG.test(probe))) {
    const list = listProducts(context.products, context, say(locale, "Манай бүтээгдэхүүнүүд:", "Our products:"));
    return done({ intent: "catalog", productIds: list.productIds, patch: { ...routed, ...list.patch }, text: list.text });
  }
  if (nothingNamed && ASKS_IF_SOLD.test(probe) && !buildProductRequest(text, context.products).variant) {
    return done({ intent: "outside", patch: routed, events: ["not_in_catalogue"], text: notInCatalogReply("", locale) });
  }
  if (nothingNamed && askedTopics.length) {
    const list = listProducts(context.products, context, say(locale, "Аль бүтээгдэхүүний талаар асууж байна вэ?", "Which product do you mean?"));
    return done({ intent: "clarify", productIds: list.productIds, patch: { ...routed, ...list.patch, pendingTopics: askedTopics }, text: list.text });
  }
  if (!intent || intent === "smalltalk" || intent === "other" || intent === "knowledge") return done({ intent: "smalltalk", patch: routed, events: ["unanswered"], text: composeReply({ intent: "other" }, context).text });
  return done({ intent: "fallback", needsHuman: true, handoffReason: "unanswered", patch: routed, events: ["unanswered"], text: contactFallback(context) });
}
