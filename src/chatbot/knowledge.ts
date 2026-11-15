/**
 * Deterministic FAQ matching for the owner's own questions and answers (shop FAQ rows and
 * per-product FAQ). A match quotes the stored answer verbatim: the model never rewrites it.
 */
import { keywordTokens, phoneticKeywordTokens, phoneticTokenMatches, unique } from "./textNorm";

export type FaqItem = { q: string; a: string };
export type FaqMatch = { item: FaqItem; score: number; shared: number };

function tokensOf(text: string) {
  return { words: unique(keywordTokens(text)), phonetic: unique(phoneticKeywordTokens(text)) };
}

/** How much of the stored question the customer's message covers (0..1), counting typo-tolerant phonetic matches. */
export function faqOverlap(question: string, candidate: string): { score: number; shared: number } {
  const asked = tokensOf(question);
  const stored = tokensOf(candidate);
  if (!stored.phonetic.length) return { score: 0, shared: 0 };
  const shared = stored.phonetic.filter((token) => asked.phonetic.some((word) => phoneticTokenMatches(word, token))).length;
  return { score: shared / stored.phonetic.length, shared };
}

/**
 * The best stored question for this message, or null. A short stored question ("Ажлын цаг хэд вэ")
 * needs every content word; a longer one needs most of them and at least two shared words.
 */
export function matchFaq(question: string, items: FaqItem[]): FaqMatch | null {
  let best: FaqMatch | null = null;
  for (const item of items) {
    const { score, shared } = faqOverlap(question, item.q);
    const storedWords = tokensOf(item.q).phonetic.length;
    const accepted = storedWords <= 2 ? score >= 1 : shared >= 2 && score >= 0.6;
    if (!accepted) continue;
    if (!best || score > best.score || (score === best.score && shared > best.shared)) best = { item, score, shared };
  }
  return best;
}
