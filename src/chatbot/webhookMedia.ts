import { phoneticLatinText } from "./textNorm";
import { isHandoffRequest as detectHandoffRequest, isFrustratedHandoffRequest as detectFrustratedHandoffRequest } from "./handoffDetection";
export const CONTACT_OPERATOR_LABEL = "Ажилтантай холбогдох";
export function normalizeLowerText(value: string): string {
  return value.trim().toLowerCase();
}
export function isQuickInfoKeyword(text: string, keywords: string[]): boolean {
  const normalized = normalizeLowerText(text);
  if (!normalized) return false;
  for (const keyword of keywords) {
    if (normalizeLowerText(keyword) === normalized) return true;
  }
  return false;
}
export function isHandoffRequest(text: string, keywords: string[]): boolean {
  return detectHandoffRequest(text, keywords);
}

export function isFrustratedHandoffRequest(text: string): boolean {
  return detectFrustratedHandoffRequest(text);
}

// Sent when the bot would repeat its previous reply word-for-word. Must never
// scold ("өмнө нь хэлсэн") and never fake an error.
export const DUPLICATE_REPLY_NUDGE =
  "Өөр асуух зүйл байвал бичээрэй 😊 Утасны дугаараа үлдээвэл манай ажилтан тантай холбогдоно.";
const BOOKING_INTENT_KEYWORDS = [
  "захиал",
  "бүртгүүл",
  "book",
  "booking",
];

/**
 * The same keywords in phonetic space, so Latin-typed Mongolian counts too.
 *
 * Mongolians routinely type Cyrillic words in Latin letters ("zahialga hiie",
 * "burtguuleh"). Matching only the Cyrillic forms missed those outright: a
 * real customer typed "zahialga hiie" — an unambiguous buy signal — and the
 * bot re-sent the same price block it had just sent instead of starting the
 * booking flow (seen in a live conversation, 2026-09-11). phoneticLatinText
 * collapses both scripts onto one spelling, so one list covers both.
 */
const BOOKING_INTENT_KEYWORDS_PHONETIC = Array.from(
  new Set(BOOKING_INTENT_KEYWORDS.map((keyword) => phoneticLatinText(keyword))),
).filter(Boolean);

export function isBookingIntent(text: string): boolean {
  const normalized = normalizeLowerText(text);
  if (!normalized) return false;
  if (BOOKING_INTENT_KEYWORDS.some((keyword) => normalized.includes(keyword))) return true;
  const phonetic = phoneticLatinText(text);
  if (!phonetic) return false;
  return BOOKING_INTENT_KEYWORDS_PHONETIC.some((keyword) => phonetic.includes(keyword));
}
// Mongolian mobile numbers are 8 digits starting with 6, 8, or 9. A 7-prefix
// 8-digit number is an Ulaanbaatar LANDLINE (e.g. a store support number),
// which must never be captured as a customer lead phone; 5 is not a mobile
// prefix either.
const MONGOLIAN_MOBILE_RE = /(?<!\d)[689]\d{7}(?!\d)/;
export function extractPhoneNumber(text: string): string {
  const compact = text.replace(/[\s\-()]/g, "");
  const match = compact.match(MONGOLIAN_MOBILE_RE);
  return match ? match[0] : "";
}
/**
 * True when the message is essentially JUST a phone number (the customer
 * answering the bot's "утасны дугаараа үлдээгээрэй" ask). Such messages get
 * a deterministic thank-you instead of an AI round-trip; a phone bundled
 * with a real question ("99119911 Test Serum A үнэ?") continues to the AI.
 */
export function isPhoneOnlyMessage(text: string): boolean {
  const compact = text.replace(/[\s\-()+.]/g, "");
  const withoutPhone = compact.replace(MONGOLIAN_MOBILE_RE, "");
  return withoutPhone.replace(/[^\p{L}\p{N}]+/gu, "").length <= 3;
}
export function isCommentTriggerMatch(commentText: string, patterns: string[]): boolean {
  const normalized = normalizeLowerText(commentText);
  if (!normalized) return false;
  for (const pattern of patterns) {
    const token = normalizeLowerText(pattern);
    if (!token) continue;
    if (token.startsWith("/") && token.endsWith("/") && token.length > 2) {
      try {
        const regex = new RegExp(token.slice(1, -1), "i");
        if (regex.test(commentText)) return true;
      } catch {
      }
      continue;
    }
    if (normalized.includes(token)) return true;
  }
  return false;
}
