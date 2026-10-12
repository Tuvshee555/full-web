/** Ported language and spelling bridges; vocabulary comes from the live catalogue. */
export const GENERIC_PRODUCT_WORDS = new Set([
 "бүтээгдэхүүн", "бүтээгдэхүүний", "хөмсөг", "хөмсөгний", "product", "products", "eyebrow", "brow", "brows",
 "үнэ", "үнийн", "үнэтэй", "хэд", "хэдэн", "ямар", "өнгө", "өнгөтэй", "хэмжээ", "байгаа", "байна", "байдаг", "байх", "уу", "юу", "вэ", "бэ", "нь", "ни", "энэ", "тэр", "надад", "танай", "манай", "авах", "авъя", "мэдээлэл", "сонирхож", "тусгай", "хямдрал",
 "price", "cost", "size", "sizes", "color", "colour", "available", "stock", "what", "which", "how", "much", "the", "it", "is", "do", "you", "have", "for", "please", "me", "can", "something", "show", "buy",
 "баярлалаа", "баярлаа", "bayrla", "bayrlaa", "bayrlalaa", "bayarlalaa", "bairlalaa", "hi", "hii", "hello", "hey", "сайн", "сайнуу", "болон", "гэхдээ", "бас"
]);
const ALIAS_REPLACEMENTS: Array<[RegExp,string]> = [
 [/\b(?:vne|une|unee|unei|unii|uniin)\b/gi,"үнэ"], [/\b(?:medeelel|medelel)\b/gi,"мэдээлэл"],
 [/\b(?:avay|avya|awy|awya|aviy|aviya|avii|avia)\b/gi,"авъя"],
 [/\b(?:homsog|humsug|homsognii|humsugnii|hömsögnii)\b/gi,"хөмсөг"],
 [/\b(?:bgaa|baigaa|bga|baina)\b/gi,"байгаа"], [/\b(?:ungu|ongotei|ungutei)\b/gi,"өнгө"],
 [/\b(?:hemjee|hemjeetei)\b/gi,"хэмжээ"], [/\b(?:heregleh|heregledeg)\b/gi,"хэрэглэх"],
 [/\b(?:buteegdehuun|buteegdehuunii)\b/gi,"бүтээгдэхүүн"], [/\b(?:une hed ve)\b/gi,"үнэ хэд вэ"]
];
export function normText(text: string) {
 let normalized = text.normalize("NFKC").toLowerCase();
 for (const [pattern,replacement] of ALIAS_REPLACEMENTS) normalized = normalized.replace(pattern,replacement);
 return normalized.replace(/[+_/\\|()[\],.:;!?-]+/g," ").replace(/\s+/g," ").trim();
}
export function isGenericConfirmationText(value: string | null | undefined): boolean {
 const normalized=(value||"").trim().toLowerCase();
 return !normalized || /баталгаажуулалт шаардлагатай|баталгаажуулах шаардлагатай|needs_manual_fix|confirmation required|review required/i.test(normalized);
}
const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "yo",
  ж: "j",
  з: "z",
  и: "i",
  й: "i",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  ө: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ү: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sh",
  ъ: "",
  ы: "i",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

export function phoneticLatinText(text: string) {
  return normText(text)
    .split("")
    .map((char) => CYRILLIC_TO_LATIN[char] ?? char)
    .join("")
    // Pinyin-style spellings of Chinese places meet their Mongolian Cyrillic
    // forms: "zh" is "ж", "ng" before a consonant is "н" ("-ngh-" / "-ngj-"),
    // and "jie" is "жэ". Romanisation rules only — no place is named here.
    .replace(/zh/g, "j")
    .replace(/ng(?=[bcdfghjklmnpqrstvwxz])/g, "n")
    .replace(/([jqx])ie/g, "$1e")
    .replace(/ts/g, "c")
    .replace(/ch/g, "c")
    .replace(/sh/g, "s")
    .replace(/kyo/g, "kio")
    .replace(/yo/g, "o")
    .replace(/yu/g, "u")
    .replace(/ya/g, "a")
    .replace(/kh/g, "h")
    .replace(/ee+/g, "e")
    .replace(/oo+/g, "o")
    .replace(/uu+/g, "u")
    .replace(/ii+/g, "i")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const GENERIC_PRODUCT_WORDS_PHONETIC = new Set(
  Array.from(GENERIC_PRODUCT_WORDS, (word) => phoneticLatinText(word)).filter(Boolean),
);

export function keywordTokens(text: string) {
  return normText(text)
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 2 && !GENERIC_PRODUCT_WORDS.has(word));
}

export function phoneticKeywordTokens(text: string) {
  return phoneticLatinText(text)
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 2 && !GENERIC_PRODUCT_WORDS_PHONETIC.has(word));
}

export function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function isOneEditApart(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.min(a.length, b.length) < 5 || Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (a.length > b.length) i += 1;
    else if (b.length > a.length) j += 1;
    else {
      i += 1;
      j += 1;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/**
 * True when the LONGER token is the shorter one plus a trailing Mongolian
 * case suffix — "далянийн" (genitive of "<хот>") vs "dalan"/"dalanin" in
 * phonetic space: "dalanin".startsWith("dalan"). Case endings (genitive,
 * accusative, dative...) add letters rather than substitute them, so this is
 * NOT a typo (isOneEditApart's territory, capped at 1 substitution) — a real
 * customer asking "Далянийн аялалын үнэ хэд вэ?" got "not_found" from the
 * resolver because the query token never equalled the bare route token.
 * Minimum shared length guards against short tokens prefix-matching by
 * coincidence, mirroring the same idiom already used for scoped-clarification
 * attribute answers (fastPathRouting.ts's filterCandidatesByAttribute).
 */
function isCaseSuffixedForm(a: string, b: string): boolean {
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  return shorter.length >= 4 && longer.length > shorter.length && longer.startsWith(shorter);
}

export function phoneticTokenMatches(queryToken: string, candidateToken: string): boolean {
  return (
    queryToken === candidateToken ||
    isOneEditApart(queryToken, candidateToken) ||
    isCaseSuffixedForm(queryToken, candidateToken)
  );
}
