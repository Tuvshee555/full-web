/**
 * One customer turn → one reply, with no database access (state, history, catalogue and the
 * model/order-lookup functions are passed in), so the whole conversation flow is testable.
 * Order ported from Uudam's webhook.ts (see handler.ts for the persistence around it):
 *   layer 0: payment claim (MUST stay first) → human request → order credentials → contact capture
 *            → thanks / greeting
 *   layer 1: keyword fast paths (delivery, payment, bank, returns, contact, medical, how to order)
 *            → product routing with numbered "which one?" memory → deterministic product answer
 *   layer 2: AI writer behind the freeform verifier (recommendations, chit-chat, unknown products)
 *   fallbacks: a catalogue list or a contact line. Never silence, never REFER to the customer.
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
import { logWarn } from "./observability";
import type { CatalogProduct, CatalogueContext, ChatMessage, ConversationState, Locale } from "./types";

export type TurnInput = {
  text: string; history: ChatMessage[]; state: ConversationState; context: CatalogueContext; senderId: string;
  askUnderstanding?: AskJson | null; askReply?: AskReply | null;
  orderLookup: (orderNumber: string, phone: string) => Promise<string | null>;
};
export type TurnOutput = { text: string; state: ConversationState; intent: string; needsHuman: boolean; productIds: string[]; model: string };

const say = (locale: Locale, mn: string, en: string) => (locale === "en" ? en : mn);

// Layer 0 #1 (Uudam: MUST stay first): a customer saying they paid. Never self-confirm a payment.
const PAYMENT_CLAIM = /(?:шилжүүлсэн|шилжүүлчихсэн|төлчихсөн|төлсөн|мөнгөө\s+(?:хийсэн|шилжүүлсэн)|tulsun|shiljuulsen|i\s+(?:have\s+)?(?:paid|transferred)|payment\s+(?:sent|made|done))/iu;
const PAYMENT_QUESTION = /(?:яаж|хаана|хэрхэн|how|where|can\s+i|болох\s+уу|boloh\s+uu)/iu;
// Explicit human requests and complaints (Uudam handoffDetection + shop complaints).
const HUMAN_REQUEST = /(?:хүнтэй|ажилтантай|оператор|гомдол|эвдэрсэн|эвдэрч|гэмтэлтэй|буруу\s+(?:бараа|бүтээгдэхүүн|өнгө).{0,20}ир|мөнгө(?:ө)?\s+буцаа|human|operator|real\s+person|complain|damaged|broken|wrong\s+(?:item|product|colou?r)|refund|hun(?:tei)?\s+(?:holbo|yari)|gomdol)/iu;
const HOW_TO_ORDER = /(?:(?:яаж|хэрхэн|yaj|herhen)\s+(?:\S+\s+)?(?:захиал|авах|zahial|avah)|захиалах\s+(?:вэ|уу)|захиалга\s+өг|how\s+(?:do|can|to)\s+(?:i\s+)?(?:order|buy|purchase)|place\s+an?\s+order)/iu;
const ORDER_TALK = /(?:захиалга|захиалсан|захиалгын|ирэхгүй|ирээгүй|хүргэгдээгүй|хаана\s+явна|zahialga|zahialsan|\border\b|hasn'?t\s+(?:arrived|come)|not\s+(?:arrived|delivered)|where\s+is\s+my)/iu;
const ORDER_COMPLAINT_AGAIN = /(?:ирэхгүй|ирээгүй|гомдол|удаж|hasn'?t|not\s+arrived|still|late)/iu;
const CONTACT_ONLY = /^[\p{L}\s.,:'-]{0,60}(?:\+?976[ -]?)?\d{4}[ -]?\d{4}[\p{L}\s.,!]{0,40}$/u;
const GROWTH = /(?:ургуул|ургах|ургана|ургадаг|урга(?:лт|на)|үс\s+ург|өтгөр(?:үүл|өх)|эмчил|urga(?:h|na|lt)?\b|urguul|regrow|grow\s+(?:back|my|in)|hair\s+growth|thicker\s+brows|make\s+(?:my\s+)?brows\s+(?:grow|thicker))/iu;
const SAFETY = /(?:харшил|жирэмсэн|хөхүүл|аюулгүй\s+юу|гаж\s+нөлөө|улайв|загатн|allerg|pregnan|breastfeed|is\s+it\s+safe|side\s+effect|sensitive\s+skin|rash|irritat)/iu;
const CATALOG = /(?:ямар\s+(?:бүтээгдэхүүн|бараа)|бүтээгдэхүүнүүд|юу\s+(?:зардаг|байна\s+вэ)|бүх\s+бүтээгдэхүүн|нимгэн|сийрэг|yamar\s+(?:buteegdehuun|baraa)|buteegdehuunuud|what\s+do\s+you\s+(?:sell|have)|list\s+(?:your\s+|all\s+)?products|all\s+products|your\s+products|sparse|thin\s+brows|recommend)/iu;
const ASKS_IF_SOLD = /(?:байгаа\s+(?:юу|уу)|байна\s+уу|зардаг\s+уу|bgaa\s+yu|baigaa\s+yu|do\s+you\s+(?:sell|have)|is\s+there)/iu;
const RULE_TOPICS: Array<[string, RegExp]> = [
  ["bank", /(?:данс|банк|dans(?:nii)?\b|bank|account\s+number)/iu],
  ["delivery", /(?:хүргэлт|хүргэх|хүргүүл|хүргэдэг|hurgelt|hurgeh|deliver|shipping)/iu],
  ["payment", /(?:qpay|карт|card|төлбөр(?:өө)?\s+(?:яаж|хэрхэн)|яаж\s+төл|хэрхэн\s+төл|how\s+(?:can|do)\s+i\s+pay|payment\s+method|pay\s+(?:by|with)|tulbur)/iu],
  ["returns", /(?:буцаа(?:х|ж)|солиулах|солих\s+боломж|return\s+(?:policy|it|the)|exchange|butsaa)/iu],
  ["contact", /(?:холбоо\s+барих|хаяг\s+(?:хаана|юу)|утасны\s+дугаар\s+(?:хэд|юу)|\bcontact\b|your\s+(?:phone|address)|where\s+are\s+you\s+located)/iu],
  ["about", /(?:та\s+нар\s+хэн|компанийн\s+тухай|about\s+(?:you|your\s+(?:shop|company|brand))|who\s+are\s+you)/iu],
];

function ruleTopic(text: string): string | null {
  for (const [topic, pattern] of RULE_TOPICS) if (pattern.test(text)) return topic;
  return null;
}

/** Products named in a reply, in the order the customer read them (so "3" means the third one shown). */
function mentionedProducts(text: string, products: CatalogProduct[]): CatalogProduct[] {
  return products
    .filter((product) => product.foodName && text.includes(product.foodName))
    .sort((a, b) => text.indexOf(a.foodName) - text.indexOf(b.foodName));
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

export async function runCustomerTurn(input: TurnInput): Promise<TurnOutput> {
  const { text, history, context } = input;
  const locale = context.locale;
  const state: ConversationState = { ...input.state };
  const handedOff = Boolean(state.handoffAt);
  const hasPriorUserTurn = history.some((message) => message.role === "user");
  const done = (out: { text: string; intent: string; needsHuman?: boolean; productIds?: string[]; patch?: ConversationState; model?: string }): TurnOutput => {
    const hasPriorReply = history.some((message) => message.role === "assistant");
    let reply = presentAssistantReply({ reply: out.text, userText: text, hasPriorReply, phoneAlreadyRequested: handedOff });
    if (!reply.trim() || /^(?:REFER|SILENT)\b/i.test(reply.trim())) reply = contactFallback(context);
    const nextState: ConversationState = { ...state, ...(out.patch || {}), lastIntent: out.intent };
    if (out.needsHuman && !nextState.handoffAt) nextState.handoffAt = Date.now();
    return { text: reply, state: nextState, intent: out.intent, needsHuman: Boolean(out.needsHuman), productIds: out.productIds || [], model: out.model || "rules" };
  };
  const human = () => done({ intent: "human", needsHuman: true, text: composeReply({ intent: "human", handoffAcknowledged: handedOff }, context).text });
  const writeVerified = async (focusProductIds: string[] = []) => {
    if (!input.askReply) return null;
    const written = await writeProductReply({ text, history, context, focusProductIds, customerMemory: typeof state.customerMemoryText === "string" ? state.customerMemoryText : undefined }, input.askReply);
    if (!written) return null;
    const checked = explainFreeformReply(written, context, text);
    if (!checked.ok) logWarn("writer.reply_rejected", { reason: checked.reason });
    return checked.ok ? checked.text : null;
  };

  // ── Layer 0 ──
  if (PAYMENT_CLAIM.test(text) && !PAYMENT_QUESTION.test(text)) {
    return done({ intent: "payment_claim", needsHuman: true, text: say(locale,
      "Баярлалаа. Төлбөрийг манай ажилтан шалгаж баталгаажуулна. Захиалгын дугаар болон утасны дугаараа бичвэл илүү хурдан шалгана.",
      "Thank you. Our team will check and confirm the payment. Sharing your order number and phone number helps us check faster.") });
  }
  if (HUMAN_REQUEST.test(text) || isFrustratedHandoffRequest(text)) return human();

  // Order help. A pending order number + a phone in this turn goes straight to the private lookup.
  const credentials = orderCredentials(text, state);
  const phoneNow = contactDetails(text).phone;
  const pendingOrder = typeof state.pendingOrderNumber === "string" && state.pendingOrderNumber ? state.pendingOrderNumber : "";
  const orderTurn = !HOW_TO_ORDER.test(text) && (ORDER_TALK.test(text) || Boolean(pendingOrder && phoneNow));
  if (orderTurn) {
    if (state.orderAskedAt && !credentials.orderNumber && !phoneNow && ORDER_COMPLAINT_AGAIN.test(text) && state.lastIntent === "order") return human();
    const status = credentials.hasOrderCredentials ? await input.orderLookup(credentials.orderNumber, credentials.phone) : null;
    return done({
      intent: "order", text: composeReply({ intent: "order", hasOrderCredentials: credentials.hasOrderCredentials, orderStatus: status }, context).text,
      patch: credentials.hasOrderCredentials
        ? { pendingOrderNumber: "", pendingOrderPhone: "", orderAskedAt: Date.now() }
        : { pendingOrderNumber: credentials.orderNumber, pendingOrderPhone: credentials.phone, orderAskedAt: Date.now() },
    });
  }
  if (handedOff && phoneNow && CONTACT_ONLY.test(text.trim())) {
    return done({ intent: "contact_capture", needsHuman: true, text: say(locale,
      "Баярлалаа, мэдээллийг тань ажилтанд дамжууллаа. Өөр асуух зүйл байвал бичээрэй.",
      "Thank you, I've passed your details to our team. Feel free to ask anything else.") });
  }
  if (isThanksOnly(text)) return done({ intent: "thanks", text: composeReply({ intent: "thanks" }, context).text });
  if (isKnownGreetingPhrase(text)) {
    return done({ intent: "greeting", text: hasPriorUserTurn ? say(locale, "Сайн байна уу! Юугаар туслах вэ?", "Hi! How can I help?") : composeReply({ intent: "greeting" }, context).text });
  }

  // ── Layer 1: keyword fast paths (no model needed) ──
  const contactLine = [context.store.contact.phone, context.store.contact.email].filter(Boolean).join(" · ");
  if (SAFETY.test(text)) {
    // Never give medical advice: point to the published ingredients, the FAQ's patch test and a doctor.
    const patchTest = context.brand.faq.find((item) => /туршиж|patch|test/i.test(item.q));
    return done({ intent: "safety", text: [say(locale,
      "Жирэмслэлт, хөхүүл үе, харшил зэрэг эрүүл мэндийн нөхцөлд бид баталгаатай зөвлөгөө өгөх боломжгүй. Хэрэглэхээс өмнө эмчтэйгээ зөвлөлдөж, бүтээгдэхүүний хуудаснаас найрлагыг шалгаарай.",
      "We can't give medical advice for pregnancy, breastfeeding, allergies or other health conditions. Please check the ingredients on the product page and ask your doctor before use."),
      ...(patchTest ? [patchTest.a] : []), contactLine].filter(Boolean).join("\n") });
  }
  if (GROWTH.test(text)) {
    const reply = composeReply({ intent: "medical" }, context).text;
    return done({ intent: "medical", text: contactLine ? `${reply}\n${contactLine}` : reply });
  }
  if (HOW_TO_ORDER.test(text)) return done({ intent: "payment", text: composeReply({ intent: "payment" }, context).text });
  const topic = ruleTopic(text);
  if (topic) {
    const composed = composeReply({ intent: topic }, context);
    return done({ intent: topic, text: composed.text, needsHuman: composed.needsHuman });
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
  // routeFastPathText records selection/clarification on `state`; carry them into the next turn.
  const routed = { productSelection: state.productSelection ?? null, clarification: state.clarification ?? null };
  const intent = route.understanding?.intent;

  if (intent === "human") return done({ intent: "human", needsHuman: true, patch: routed, text: composeReply({ intent: "human", handoffAcknowledged: handedOff }, context).text });
  if (intent === "order") return done({ intent: "order", patch: { ...routed, orderAskedAt: Date.now() }, text: composeReply({ intent: "order", hasOrderCredentials: false }, context).text });
  if (intent && ["delivery", "payment", "bank", "returns", "about", "contact"].includes(intent) && !route.chosenProductId && !route.scopedClarify?.length) {
    const composed = composeReply({ intent }, context);
    return done({ intent, patch: routed, text: composed.text, needsHuman: composed.needsHuman });
  }
  if (route.notInCatalog) {
    const written = await writeVerified();
    return done({ intent: "outside", patch: routed, text: written || notInCatalogReply(route.notInCatalog, locale), model: written ? "writer" : "rules" });
  }

  // Deterministic product answer (Uudam's structured answer): one product, or a numbered choice list.
  const pendingTopics = Array.isArray(state.pendingTopics) ? state.pendingTopics as ProductTopic[] : [];
  const askedTopics = buildProductRequest(text, context.products, route.understanding).topics;
  const answerFor = (productRoute: FastPathRoute) => buildProductAnswerPlan({ text, context, route: productRoute, pendingTopics });
  // A clarifying list remembers what was asked, so the customer's pick answers that question.
  const topicMemory = (status: string) => status === "clarify" ? { pendingTopics: askedTopics } : { pendingTopics: [] };
  // "Which is the cheapest?": computed from the catalogue, never guessed.
  if (askedTopics.includes("budget") && /хамгийн\s+хямд|cheapest|lowest\s+price|hamgiin\s+hyamd/iu.test(text)) {
    const pool = route.scopedClarify?.length && !/бүх|all/iu.test(text) ? route.scopedClarify : context.products;
    const cheapest = [...pool].sort((a, b) => a.price - b.price)[0];
    if (cheapest) return done({ intent: "product", productIds: [cheapest.id],
      patch: { ...routed, productSelection: { selection: { productId: cheapest.id, variantId: null }, updatedAt: Date.now() }, clarification: null, pendingTopics: [] },
      text: [say(locale, "Хамгийн хямд нь:", "The cheapest is:"), formatProductLine(cheapest, context)].join("\n") });
  }
  // Open questions about a product (what's in it, differences, which is better) go to the writer,
  // which answers from the description; the deterministic plan only knows price/stock/usage sections.
  const openQuestion = /(?:юу\s+юу|юутай|юунаас|ямар\s+ялгаа|ялгаа(?:тай)?|аль\s+нь\s+(?:дээр|сайн|илүү)|тухай|талаар|what(?:'s|\s+is)\s+in|difference|compare|which\s+(?:one\s+)?is\s+better|better\s+for|tell\s+me\s+about|what\s+is\s+it)/iu.test(text);
  if (input.askReply && (openQuestion || askedTopics.includes("comparison")) && (route.chosenProductId || route.scopedClarify?.length || route.understanding?.products.length)) {
    const focusIds = route.chosenProductId ? [route.chosenProductId] : (route.scopedClarify?.length ? route.scopedClarify : route.understanding?.products || []).map((product) => product.id);
    const answer = await writeVerified(focusIds);
    if (answer) return done({ intent: "product", productIds: focusIds, patch: { ...routed, pendingTopics: [] }, text: answer, model: "writer" });
  }
  const resolvedSeveral = !route.chosenProductId && !route.scopedClarify?.length && intent === "product" && (route.understanding?.products.length || 0) > 1;
  const plan = route.chosenProductId || route.scopedClarify?.length || resolvedSeveral ? answerFor(route) : null;
  if (plan && plan.status !== "handoff") return done({ intent: plan.status === "clarify" ? "clarify" : "product", productIds: plan.productIds, patch: { ...routed, ...topicMemory(plan.status) }, text: plan.reply });
  // A follow-up that names nothing ("how much is it?") is about the product already in focus.
  const focused = (state.productSelection as { selection?: { productId?: string } } | null)?.selection?.productId;
  const namesNothing = resolveProductFromUserMessage(text, context.products, { allowLooseFallback: false }).status === "not_found";
  if (!plan && focused && namesNothing && askedTopics.length && context.products.some((product) => product.id === focused) && !route.understanding?.products.length) {
    const focusedPlan = answerFor({ matchText: text, scopedClarify: null, chosenProductId: focused });
    if (focusedPlan && focusedPlan.status !== "handoff") return done({ intent: "product", productIds: focusedPlan.productIds, patch: { ...routed, pendingTopics: [] }, text: focusedPlan.reply });
  }

  // ── Layer 2: the AI writer (recommendations, chit-chat, knowledge, unanswered details) ──
  const focus = plan?.productIds || route.understanding?.products.map((product) => product.id) || [];
  const written = await writeVerified(focus);
  if (written) {
    // Remember what the reply offered, so "how do I use it?" / "the first one" resolves next turn.
    const offered = mentionedProducts(written, context.products);
    const memory = offered.length > 1
      ? { clarification: { candidateProductIds: offered.map((product) => product.id), createdAt: Date.now() } }
      : offered.length === 1 ? { productSelection: { selection: { productId: offered[0].id, variantId: null }, updatedAt: Date.now() }, clarification: null } : {};
    return done({ intent: intent || "ai", productIds: offered.map((product) => product.id), patch: { ...routed, ...memory }, text: written, model: "writer" });
  }

  // ── Fallbacks: still a real answer ──
  const nothingNamed = namesNothing;
  if (intent === "catalog" || (nothingNamed && CATALOG.test(text))) {
    const list = listProducts(context.products, context, say(locale, "Манай бүтээгдэхүүнүүд:", "Our products:"));
    return done({ intent: "catalog", productIds: list.productIds, patch: { ...routed, ...list.patch }, text: list.text });
  }
  if (nothingNamed && ASKS_IF_SOLD.test(text) && !buildProductRequest(text, context.products).variant) {
    return done({ intent: "outside", patch: routed, text: notInCatalogReply("", locale) });
  }
  if (nothingNamed && askedTopics.length) {
    const list = listProducts(context.products, context, say(locale, "Аль бүтээгдэхүүний талаар асууж байна вэ?", "Which product do you mean?"));
    return done({ intent: "clarify", productIds: list.productIds, patch: { ...routed, ...list.patch, pendingTopics: askedTopics }, text: list.text });
  }
  if (!intent || intent === "smalltalk" || intent === "other" || intent === "knowledge") return done({ intent: "smalltalk", patch: routed, text: composeReply({ intent: "other" }, context).text });
  return done({ intent: "fallback", needsHuman: true, patch: routed, text: contactFallback(context) });
}
