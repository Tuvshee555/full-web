/**
 * Separates WHICH PRODUCT a message is about from WHAT the customer is asking.
 *
 * Routing hands the reply builders one string: context that identifies the
 * product (a product name, or the bot's previous reply) followed by the customer's
 * current message. Every intent detector used to read that whole string, so:
 *   - words inside PRODUCT NAMES became questions — tapping a product named
 *     "<хот> [сар]-р сарын аяллын хөтөлбөр" sent the PDF ("хөтөлбөр"), tapping
 *     any "…шууд нислэгтэй аялал" answered only "Энэ аялал шууд нислэгтэй",
 *     and a name ending in a date ("…-[сар]/[өдөр]") was read as a date question;
 *   - the bot's OWN previous reply became the question — "амжилт" or
 *     "za bolchloo" after a price answer was treated as a price question,
 *     matched no product, and the customer was silently handed to staff.
 *
 * The customer's turn is now marked inside routed text, and intent is read
 * only from that turn, with product names removed.
 */

import type { CatalogProduct } from "./types";

/** U+2029 PARAGRAPH SEPARATOR — never typed by customers; whitespace to every matcher. */
export const CUSTOMER_TURN_MARK = " ";

/** Context (product name / previous reply) followed by the marked customer turn. */
export function joinContextAndTurn(context: string, turn: string): string {
  const cleanTurn = turn.split(CUSTOMER_TURN_MARK).join(" ").trim();
  return context.trim() ? `${context.trim()}\n${CUSTOMER_TURN_MARK}${cleanTurn}` : cleanTurn;
}

/**
 * U+2063 INVISIBLE SEPARATOR — marks routed text the understanding step
 * decided is about NO product ("aylal", "Үнийн санал", a greeting). The product
 * matchers treat marked text as matching nothing, so a weak keyword can no
 * longer pull a random product into the answer downstream.
 */
export const NO_PRODUCT_MARK = "⁣";

export function markNoProduct(text: string): string {
  return text.includes(NO_PRODUCT_MARK) ? text : `${NO_PRODUCT_MARK}${text}`;
}

export function isNoProductText(text: string): boolean {
  return text.includes(NO_PRODUCT_MARK);
}

/** The customer's own current message inside routed text. */
export function customerTurn(text: string): string {
  const index = text.lastIndexOf(CUSTOMER_TURN_MARK);
  return (index >= 0 ? text.slice(index + 1) : text).trim();
}

function looseNorm(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

const patternCache = new Map<string, RegExp | null>();

function productNamePattern(name: string): RegExp | null {
  if (patternCache.has(name)) return patternCache.get(name) ?? null;
  const parts = name.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const pattern = parts.length === 0
    ? null
    : new RegExp(
        `(?<![\\p{L}\\p{N}])${parts
          .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
          .join("[^\\p{L}\\p{N}]+")}(?![\\p{L}\\p{N}])`,
        "giu",
      );
  if (patternCache.size > 500) patternCache.clear();
  patternCache.set(name, pattern);
  return pattern;
}

/** "2. <first letters of a product name>…" — one of our numbered product buttons, possibly truncated. */
const NUMBERED_BUTTON_LINE = /^\s*\d{1,2}\s*[.)]\s*(.+?)\s*(?:\.\.\.|…)?\s*$/u;

/**
 * The text with every catalog product NAME removed (exact names, and numbered
 * button titles that are a prefix of a name). Use it for intent detection
 * only — never for deciding which product the message is about.
 */
export function stripProductNamesForIntent(text: string, products: CatalogProduct[]): string {
  const names = Array.from(new Set(products.map((product) => product.foodName).filter(Boolean)))
    .sort((a, b) => b.length - a.length);
  const looseNames = names.map(looseNorm);
  return text
    .split("\n")
    .map((line) => {
      const button = NUMBERED_BUTTON_LINE.exec(line);
      if (button) {
        const rest = looseNorm(button[1]);
        if (rest.length >= 3 && looseNames.some((name) => name.startsWith(rest))) return "";
      }
      let stripped = line;
      for (const name of names) {
        const pattern = productNamePattern(name);
        if (pattern) stripped = stripped.replace(pattern, " ");
      }
      return stripped.replace(/[ \t]{2,}/g, " ").trim();
    })
    .join("\n")
    .trim();
}

/** What the customer is asking: their current turn, product names removed. */
export function intentTextOf(text: string, products: CatalogProduct[]): string {
  return stripProductNamesForIntent(customerTurn(text), products);
}
