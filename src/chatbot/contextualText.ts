/**
 * Reference-resolution helper shared by the production webhook and the demo
 * endpoint (previously a webhook-local copy — demo silently behaved
 * differently from Messenger, so QA runs missed production-only bugs).
 *
 * When the current message is too short/vague to stand alone ("тэр ямар
 * үнэтэй вэ?", "дахиад зураг"), the last few USER turns are prepended so the
 * deterministic fast-path matchers can resolve what "тэр" refers to.
 *
 * IMPORTANT usage contract (see webhook fast-path dispatch): matchers must try
 * the RAW current message first and only fall back to this contextual text
 * when the raw message alone cannot resolve a product. Matching over the
 * concatenated turns first lets a product mentioned three turns ago outscore the
 * product the customer is asking about right now.
 */

import { joinContextAndTurn } from "./customerTurn";
import { isKnownGreetingPhrase, isThanksOnly } from "./greetingPhrases";

export function normalizeContextText(text: string) {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isLikelyContextDependentText(text: string) {
  const normalized = normalizeContextText(text);
  if (!normalized) return false;
  // Bug (found 2026-07-22 replaying real traffic): a customer typed just
  // "hi" two days after asking about a product, and got that product's price/dates
  // re-served instead of a greeting — the words.length<=2 rule below treats
  // EVERY short message as a follow-up reference, with no exception for an
  // actual greeting, which carries no question to resolve via context at
  // all. A real greeting is never context-dependent, checked BEFORE the
  // short-text catch-all (which still correctly keeps real short answers
  // like "5" or "<city>" context-dependent/self-resolving).
  if (isKnownGreetingPhrase(text)) return false;
  // Same reasoning for a bare thank-you: it asks nothing, so it must not borrow
  // the previous turns' products (a real "Баярлалаа" got a <city> product list).
  if (isThanksOnly(text)) return false;
  // "10р сарын бүтээгдэхүүн байна уу" asks the whole catalog about a month. Asked a
  // second time, it was read as a follow-up to the previous list and answered
  // with that list's products — November products included — instead of October's.
  
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length <= 2) return true;
  // "11-13хүн байна", "бид 4 хүн": a group size for the product on screen.
  if (/^\s*(?:бид\s*|bid\s*)?\d{1,3}(?:\s*[-–]\s*\d{1,3})?\s*(?:хүн|hun)/i.test(text)) return true;
  if (!hasReferentialHint(text)) return false;
  if (normalized.length <= 24) return true;

  // A hint word alone isn't enough on longer messages: if the message also
  // carries its own content words (a product name, a city), it stands alone and
  // must NOT be diluted with old turns.
  const contentWords = words.filter(
    (word) =>
      word.length >= 4 &&
      !REFERENTIAL_HINTS.includes(word) &&
      !NON_CONTENT_WORDS.includes(word) &&
      // A conditional verb ("явбал", "гарвал", "ирвэл", "yavbal") is never a
      // place: "1 сарын 25-нд явбал хэд вэ" under a product card asks about THAT
      // product, and was cut off from it and silenced as no-data.
      !CONDITIONAL_VERB.test(word),
  );
  return contentWords.length === 0;
}


/** Mongolian conditional verb form ("-бал/-вал/-бол/-вол"), Cyrillic or Latin-typed. */
const CONDITIONAL_VERB = /^[\p{L}]{2,}(?:[бв][аоэө]л|[bv][aoe]l)$/u;

/** Words that point back at something already on screen ("тэр", "үнэ", "нь"). */
export function hasReferentialHint(text: string): boolean {
  const normalized = normalizeContextText(text);
  return (
    REFERENTIAL_HINTS.some((hint) => normalized.includes(hint)) ||
    /(?:^|\s)(?:нь|ni)(?:\s|$)/.test(normalized) ||
    LATIN_REFERENTIAL_HINT.test(normalized)
  );
}

// The same hints typed in Latin letters ("Une hed ve"). Whole words only:
// short Latin stems sit inside place names ("ter" in a Latin city spelling).
const LATIN_REFERENTIAL_HINT =
  /(?:^|\s)(?:une|unee|uni|unii|unetei|hed|heden|niit|hezee|ognoo|suudal|huuhed|huuhdiin|nyrai|hutulbur|ter|ene|dahiad|dahin)(?:\s|$)/;

const REFERENTIAL_HINTS = [
  "again",
  "more",
  "photo",
  "photos",
  "program",
  "pdf",
  "price",
  "dates",
  "seat",
  "seats",
  "zurag",
  "үнэ",
  "хэд",
  "нийт",
  "болох",
  "хэзээ",
  "сарын",
  "огноо",
  "суудал",
  "хөтөлбөр",
  "зураг",
  "хүүхэд",
  "хүүхдийн",
  "нярай",
  "тийзтэй",
  "тийзгүй",
  "ticket",
  "дахин",
  "дахиад",
  "өөр",
  "адил",
  "энэ",
  "тэр",
  "эхний",
  "эхнийх",
  "эхнийх нь",
  "нэгдүгээр",
  "first",
];

const NON_CONTENT_WORDS = [
  // Latin-typed question words, as in LATIN_REFERENTIAL_HINT.
  "unee", "unii", "unetei", "heden", "niit", "hezee", "ognoo", "suudal", "huuhed", "huuhdiin",
  "nyrai", "hutulbur", "dahiad", "dahin", "aylal", "ayalal", "aylaliin", "baina", "bgaa", "yavah",
  "sariin", "sarin", "sard", "sarda", "udur", "ognoond",
  "бүтээгдэхүүн",
  "бүтээгдэхүүний",
  "зураг",
  "хөтөлбөр",
  "program",
  "price",
  "dates",
  "seat",
  "seats",
  "үнэ",
  "хэд",
  "вэ",
  "юу",
  "нь",
  "нийт",
  "болох",
  "сарын",
  "өөр",
  "адил",
  "нд",
  "огноо",
  "суудал",
  "хүүхэд",
  "хүүхдийн",
  "нярай",
  "тийзтэй",
  "тийзгүй",
  "ticket",
  "том",
  "хүн",
  "үнэтэй",
  "төлбөртэй",
  "child",
  "infant",
  "adult",
  // Question words, not product names: "хамгийн сүүлийн бүтээгдэхүүн нь хэдэн
  // сарын хэдэнд гарах вэ" right after a product card asks about THAT product.
  "хамгийн",
  "сүүлийн",
  "сүүлд",
  "эхний",
  "дараагийн",
  "хэдэн",
  "хэдэнд",
  "гарах",
  "явах",
  "хэзээ",
  "хоног",
  "өдөр",
];

function isGenericAssistantFollowup(text: string) {
  const normalized = normalizeContextText(text);
  return (
    normalized.includes("аль нь хэрэгтэй") ||
    normalized.includes("алийг хэлж") ||
    normalized.includes("аль аяллыг") ||
    normalized.includes("нэг тодруулаад") ||
    // The model asking "which city/product are you interested in?" has not
    // settled on a product — its examples must not become the customer's pick.
    /ямар\s+(?:\S+\s+)?(?:аял|хот|чиглэл)\S*\s+(?:\S+\s+){0,3}(?:сонирхож|авахыг|явахыг)/.test(normalized)
  );
}

function isFirstOptionFollowup(text: string) {
  const normalized = normalizeContextText(text);
  return (
    normalized.includes("эхний") ||
    normalized.includes("эхнийх") ||
    normalized.includes("нэгдүгээр") ||
    normalized.includes("first") ||
    normalized === "1"
  );
}

function firstAssistantOption(text: string): string | null {
  for (const line of text.split("\n")) {
    const cleaned = line.trim().replace(/^[•*\-]\s*/, "").replace(/^\d+[.)]\s*/, "").trim();
    if (!cleaned || cleaned.length < 4) continue;
    if (!/^[•*\-]|\d+[.)]/.test(line.trim())) continue;
    const normalized = normalizeContextText(cleaned);
    // "Label: 6,490,000₮" is a price detail of the card, never a product name
    // (a list line reads "<product> — <details>"). The solo-traveller line
    // "Ганцаараа явбал: …₮" was taken as the product, and "Хөтөлбөр үзэх" under
    // that card got an AI summary instead of the product's PDF.
    if (/^[^—]{0,40}:\s*[\d][\d.,\s]*₮/.test(cleaned)) continue;
    if (
      normalized.startsWith("том хүн") ||
      normalized.startsWith("хүүхэд") ||
      normalized.startsWith("нярай") ||
      normalized.startsWith("гарах") ||
      normalized.startsWith("насанд хүрэгч")
    ) {
      continue;
    }
    return cleaned.split(" — ")[0]?.trim() || cleaned;
  }
  return null;
}

function likelyRefersToPreviousAssistantOption(text: string) {
  const normalized = normalizeContextText(text);
  return (
    normalized.includes("тэр") ||
    normalized.includes("нь") ||
    normalized.includes("зураг") ||
    normalized.includes("хөтөлбөр") ||
    normalized.includes("pdf") ||
    normalized.includes("хүүхэд") ||
    normalized.includes("хүүхдийн") ||
    normalized.includes("нярай")
  );
}

// "[1 зураг илгээсэн]" / "[Хэрэглэгч зураг илгээсэн]": history placeholders for
// attachment-only rows. They name no product, so they must never stand in as the
// "previous reply" — after a photo send, every follow-up lost its product.
function isAttachmentPlaceholder(text: string) {
  return /^\[[^\]]*илгээсэн\]$/i.test(text.trim());
}

/** The bot's last real reply (attachment placeholders skipped), if any. */
export function lastAssistantReply(
  history: Array<{ role: "user" | "assistant"; text: string }>,
): string | undefined {
  return [...history]
    .reverse()
    .find(
      (message) =>
        message.role === "assistant" &&
        message.text.trim() &&
        !isAttachmentPlaceholder(message.text),
    )
    ?.text.trim();
}

export function buildContextualUserText(
  history: Array<{ role: "user" | "assistant"; text: string }>,
  userText: string,
) {
  if (!isLikelyContextDependentText(userText)) return userText;
  const previousAssistantReply = lastAssistantReply(history);
  // The customer's current turn is marked (see customerTurn.ts): the context
  // before it only identifies the product, and must never be read as the question.
  if (previousAssistantReply && isFirstOptionFollowup(userText)) {
    const firstOption = firstAssistantOption(previousAssistantReply);
    if (firstOption) return joinContextAndTurn(firstOption, userText);
  }
  // "Хөтөлбөр үзэх" under a "which product?" list names no product: taking the
  // list's first line was a guess (a real customer got the wrong programme).
  if (
    previousAssistantReply &&
    likelyRefersToPreviousAssistantOption(userText) &&
    !isGenericAssistantFollowup(previousAssistantReply)
  ) {
    const firstOption = firstAssistantOption(previousAssistantReply);
    if (firstOption) return joinContextAndTurn(firstOption, userText);
  }
  if (previousAssistantReply && !isGenericAssistantFollowup(previousAssistantReply)) {
    return joinContextAndTurn(previousAssistantReply, userText);
  }
  const recentUserTurns = history
    .filter((message) => message.role === "user")
    .map((message) => message.text.trim())
    .filter((message) => message && !isAttachmentPlaceholder(message))
    .slice(-4);
  if (recentUserTurns.length === 0) return userText;
  return joinContextAndTurn(recentUserTurns.join("\n"), userText);
}

type ProductResolution<TProduct> =
  | { status: "verified"; product: TProduct }
  | { status: "ambiguous"; candidates: TProduct[] }
  | { status: string };

type ProductResolver<TProduct> = (text: string) => ProductResolution<TProduct>;

/**
 * Which text should the deterministic product matchers see?
 *
 * Priority: (1) the current message alone resolves a product → use it;
 * (2) the current message is ambiguous and the contextual blob verifies one
 * OF THOSE candidates → use the context (legit narrowing: "<хот>" earlier +
 * "шууд нислэгтэй нь" now); a contextual winner OUTSIDE the candidates is a
 * stale unrelated product hijacking the match and is rejected; (3) the current
 * message is ambiguous otherwise → clarify from what the customer JUST said;
 * (4) the current message resolves nothing → fall back to the contextual blob.
 *
 * Matching over the concatenated turns first (the old behavior) let a product
 * mentioned three turns ago outscore the product the customer is asking about
 * right now — confident, well-formatted, wrong-product answers.
 */
export function pickFastPathMatchText<TProduct extends { id: string }>(
  text: string,
  contextualUserText: string,
  resolve: ProductResolver<TProduct>,
): string {
  if (contextualUserText === text) return text;
  const direct = resolve(text);
  if (direct.status === "verified") return text;
  const contextual = resolve(contextualUserText);
  if (direct.status === "ambiguous" && "candidates" in direct) {
    if (contextual.status === "verified" && "product" in contextual) {
      const candidateIds = new Set(direct.candidates.map((product) => product.id));
      if (candidateIds.has(contextual.product.id)) return contextualUserText;
    }
    return text;
  }
  if (contextual.status === "verified") return contextualUserText;
  return contextualUserText;
}
