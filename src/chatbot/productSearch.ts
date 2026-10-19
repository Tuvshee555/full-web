/** Port of the source name/alias vocabulary matcher, with variant requirements replacing schedules. */
import type { CatalogProduct } from "./types";
import { isNoProductText } from "./customerTurn";
import { keywordTokens, normText, phoneticKeywordTokens, phoneticLatinText, phoneticTokenMatches, unique } from "./textNorm";
export { keywordTokens, normText, phoneticKeywordTokens, phoneticLatinText, unique } from "./textNorm";
export type ProductMatch = { product: CatalogProduct; matchedWords: string[]; keywordCoverage: number; score: number };
export type ProductResolution =
  | { status: "verified"; product: CatalogProduct; candidates: CatalogProduct[] }
  | { status: "ambiguous"; product: null; candidates: CatalogProduct[] }
  | { status: "not_found"; product: null; candidates: [] };

// Product aliases are catalogue-owned: the actual category and variant labels are additional name evidence.
export function getAliases(product: CatalogProduct): string[] {
  return [product.category?.categoryName || product.category?.name || "", ...product.sizes.map((variant) => variant.label)].filter(Boolean);
}
export function getProductSearchHaystack(product: CatalogProduct): string {
  return [product.productName, ...getAliases(product)].join(" ");
}
export function getProductNameHaystack(product: CatalogProduct): string { return normText(getProductSearchHaystack(product)); }

type VocabularyEntry = { word: string; phonetic: string };
type CatalogVocabulary = { entries: VocabularyEntry[]; known: Set<string>; knownPhonetic: Set<string> };
const vocabularyCache = new WeakMap<CatalogProduct[], CatalogVocabulary>();

/** Every word of every product name and alias — the only name list the matcher knows. */
function catalogVocabulary(products: CatalogProduct[]): CatalogVocabulary {
  const cached = vocabularyCache.get(products);
  if (cached) return cached;
  const names = products.flatMap((product) => [product.productName, ...getAliases(product)]);
  const entries = unique(names.flatMap((name) => keywordTokens(name))).filter((word) => !/\d/.test(word))
    .map((word) => ({ word, phonetic: phoneticLatinText(word).replace(/\s+/g, "") }));
  const vocabulary = { entries, known: new Set(entries.map((entry) => entry.word)), knownPhonetic: new Set(entries.map((entry) => entry.phonetic)) };
  vocabularyCache.set(products, vocabulary);
  return vocabulary;
}
function commonPrefixLength(a: string, b: string): number {
  let index = 0;
  while (index < a.length && index < b.length && a[index] === b[index]) index += 1;
  return index;
}
function editDistance(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = previous[0]; previous[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = previous[j];
      previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return previous[b.length];
}
function consonantOutline(word: string): string { return word.replace(/[аэиоуөүеёюяыйьъaeiouy]/g, ""); }
function catalogSpellingsOf(word: string, vocabulary: CatalogVocabulary): VocabularyEntry[] {
  const phonetic = phoneticLatinText(word).replace(/\s+/g, "");
  if (word.length < 5 || /\d/.test(word) || vocabulary.known.has(word) || vocabulary.knownPhonetic.has(phonetic)) return [];
  if (vocabulary.entries.some((entry) => entry.word.startsWith(word) || word.startsWith(entry.word))) return [];
  const samePrefix = vocabulary.entries.filter((entry) => entry.word.length >= 6 && commonPrefixLength(word, entry.word) >= 6);
  if (samePrefix.length > 0) return samePrefix.slice(0, 3);
  const oneOff = vocabulary.entries.filter((entry) => word.length >= 6 && entry.word.length >= 6 && commonPrefixLength(word, entry.word) >= 4 && editDistance(word, entry.word) <= 1);
  if (oneOff.length > 0 && oneOff.length <= 3) return oneOff;
  const outline = consonantOutline(word);
  if (word.length >= 6 && outline.length >= 4) {
    const sameOutline = vocabulary.entries.filter((entry) => entry.word.length >= 6 && entry.word.slice(0, 2) === word.slice(0, 2) && consonantOutline(entry.word) === outline);
    if (sameOutline.length > 0 && sameOutline.length <= 3) return sameOutline;
  }
  return [];
}
function snapMisspelledWords(words: string[], phoneticWords: string[], vocabulary: CatalogVocabulary) {
  const snapped = words.flatMap((word) => catalogSpellingsOf(word, vocabulary));
  if (!snapped.length) return { words, phoneticWords };
  return { words: unique([...words, ...snapped.map((entry) => entry.word)]), phoneticWords: unique([...phoneticWords, ...snapped.map((entry) => entry.phonetic)]) };
}
function sameWordStem(a: string, b: string): boolean {
  if (a.length < 4 || b.length < 4) return false;
  return a.startsWith(b) || b.startsWith(a) || commonPrefixLength(a, b) >= 6;
}
function splitGluedWords(words: string[], products: CatalogProduct[]): string[] {
  if (!words.some((word) => word.length >= 8)) return words;
  const vocabulary = unique(products.flatMap((product) => keywordTokens(product.productName)));
  const known = new Set(vocabulary); const extra: string[] = [];
  for (const word of words) {
    if (word.length < 8 || known.has(word)) continue;
    for (let cut = 3; cut <= word.length - 3; cut += 1) {
      const head = word.slice(0, cut); const tail = word.slice(cut);
      const headWord = vocabulary.find((token) => token.startsWith(head) && token.length - head.length <= 3);
      const tailWord = vocabulary.find((token) => token === tail || (token.startsWith(tail) && token.length - tail.length <= 3));
      if (headWord && tailWord) { extra.push(headWord, tailWord); break; }
    }
  }
  return extra.length > 0 ? unique([...words, ...extra]) : words;
}

export function findProductMatches(text: string, products: CatalogProduct[]): ProductMatch[] {
  if (isNoProductText(text)) return [];
  const query = normText(text); const queryPhonetic = phoneticLatinText(text);
  const vocabulary = catalogVocabulary(products);
  const { words: queryWords, phoneticWords: queryPhoneticWords } = snapMisspelledWords(splitGluedWords(unique(keywordTokens(text)), products), unique(phoneticKeywordTokens(text)), vocabulary);
  if (!queryWords.length && !queryPhoneticWords.length) return [];
  const matches: ProductMatch[] = [];
  for (const product of products) {
    const routeNorm = normText(product.productName); const routePhonetic = phoneticLatinText(product.productName);
    const routeKeywords = unique(keywordTokens(product.productName)); const routePhoneticKeywords = unique(phoneticKeywordTokens(product.productName));
    if (!routeKeywords.length && !routePhoneticKeywords.length) continue;
    let aliasHit = 0;
    for (const alias of getAliases(product)) {
      const aliasNorm = normText(alias); const aliasPhonetic = phoneticLatinText(alias);
      if (aliasNorm && (query.includes(aliasNorm) || aliasNorm.includes(query))) { aliasHit = 1; break; }
      if (aliasPhonetic && queryPhonetic && (queryPhonetic.includes(aliasPhonetic) || aliasPhonetic.includes(queryPhonetic))) { aliasHit = 1; break; }
      const aliasTokens = unique(phoneticKeywordTokens(alias));
      const shared = aliasTokens.filter((token) => queryPhoneticWords.some((word) => phoneticTokenMatches(word, token)));
      if (shared.length) aliasHit = Math.max(aliasHit, Math.min(1, shared.length / Math.max(1, aliasTokens.length)));
    }
    const matchedWords = unique([...routeKeywords.filter((word) => queryWords.includes(word)), ...routePhoneticKeywords.filter((word) => queryPhoneticWords.some((queryWord) => phoneticTokenMatches(queryWord, word)))]);
    const routeTokenPool = unique([...routeKeywords, ...routePhoneticKeywords]);
    const coverage = matchedWords.length / routeTokenPool.length;
    const exactRouteHit = routeNorm && (query.includes(routeNorm) || (routePhonetic.length > 0 && queryPhonetic.includes(routePhonetic))) ? 1 : 0;
    const minMatchCount = routeTokenPool.length === 1 ? 1 : 2;
    const strongTokenHit = matchedWords.some((word) => word.length >= 4);
    if (matchedWords.length < minMatchCount && exactRouteHit === 0 && aliasHit === 0 && !strongTokenHit) continue;
    if (coverage < 0.5 && exactRouteHit === 0 && aliasHit === 0 && !strongTokenHit) continue;
    // Unknown catalogue words cannot be rescued by a weak shared word.
    const unknown = queryWords.filter((word) => word.length >= 4 && !vocabulary.entries.some((entry) => sameWordStem(word, entry.word) || phoneticTokenMatches(phoneticLatinText(word), entry.phonetic)));
    const score = exactRouteHit * 100 + aliasHit * 80 + matchedWords.length * 20 + coverage * 10 - Math.max(0, routeKeywords.length - matchedWords.length) - unknown.length * 15;
    matches.push({ product, matchedWords, keywordCoverage: coverage, score });
  }
  return matches.sort((a, b) => b.score - a.score || b.matchedWords.length - a.matchedWords.length || a.product.productName.localeCompare(b.product.productName, "mn"));
}

const MAX_PRODUCT_CANDIDATES = 8;
export function resolveProductFromUserMessage(text: string, products: CatalogProduct[], _options: { allowLooseFallback?: boolean } = {}): ProductResolution {
  const matches = findProductMatches(text, products);
  if (!matches.length) return { status: "not_found", product: null, candidates: [] };
  const [best, second] = matches;
  const normalizedQuery = normText(text);
  const fullNameMentions = matches.filter((match) => normText(match.product.productName).length >= 8 && normalizedQuery.includes(normText(match.product.productName)));
  if (fullNameMentions.length === 1) return { status: "verified", product: fullNameMentions[0].product, candidates: [] };
  const queryTokens = unique(phoneticKeywordTokens(text));
  const indistinguishable = matches.filter((match) => {
    const tokens = phoneticKeywordTokens(getProductSearchHaystack(match.product));
    return queryTokens.length > 0 && queryTokens.every((word) => tokens.some((token) => phoneticTokenMatches(word, token)));
  });
  if (indistinguishable.length > 1) return { status: "ambiguous", product: null, candidates: indistinguishable.slice(0, MAX_PRODUCT_CANDIDATES).map((match) => match.product) };
  if (indistinguishable.length === 1 && indistinguishable[0].product.id === best.product.id) return { status: "verified", product: best.product, candidates: [] };
  if (second && best.score - second.score <= 5 && Math.abs(best.keywordCoverage - second.keywordCoverage) <= 0.15) return { status: "ambiguous", product: null, candidates: matches.slice(0, MAX_PRODUCT_CANDIDATES).map((match) => match.product) };
  if (best.score <= 0 && matches.length > 1) return { status: "ambiguous", product: null, candidates: matches.slice(0, MAX_PRODUCT_CANDIDATES).map((match) => match.product) };
  return { status: "verified", product: best.product, candidates: [] };
}
export function isGenericProductRequest(text: string): boolean {
  return !keywordTokens(text).length || /^(?:үнэ|мэдээлэл|хэмжээ|өнгө|price|size|color|colour|stock|une)(?:\s+(?:хэд|вэ|нь|ни|hed|ve|ni))*[?!.]*$/iu.test(text.trim());
}
