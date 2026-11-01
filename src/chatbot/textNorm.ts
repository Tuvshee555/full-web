/**
 * Language and spelling bridges for Mongolian customers. Vocabulary (product names, shades)
 * comes from the live catalogue; this file only knows how Mongolian is typed: Cyrillic, Latin
 * letters ("une hed ve"), glued words ("unehedve"), slang ("bga yu", "bn uu") and typos.
 *
 * normText() lowercases, maps the Latin spellings below to their Cyrillic words and strips
 * punctuation, so every intent pattern and the product matcher see one spelling.
 */
export const GENERIC_PRODUCT_WORDS = new Set([
 "бүтээгдэхүүн", "бүтээгдэхүүний", "хөмсөг", "хөмсөгний", "product", "products", "eyebrow", "brow", "brows",
 "үнэ", "үнийн", "үнэтэй", "хэд", "хэдэн", "ямар", "өнгө", "өнгөтэй", "хэмжээ", "байгаа", "байна", "байдаг", "байх", "уу", "юу", "вэ", "бэ", "нь", "ни", "энэ", "тэр", "надад", "танай", "манай", "авах", "авъя", "мэдээлэл", "сонирхож", "тусгай", "хямдрал",
 "price", "cost", "size", "sizes", "color", "colour", "available", "stock", "what", "which", "how", "much", "the", "it", "is", "do", "you", "have", "for", "please", "me", "can", "something", "show", "buy",
 "баярлалаа", "баярлаа", "bayrla", "bayrlaa", "bayrlalaa", "bayarlalaa", "bairlalaa", "hi", "hii", "hello", "hey", "сайн", "сайнуу", "болон", "гэхдээ", "бас",
 // Function words and intent words: they describe the question, never which product it is about.
 // "Харин" (however) used to fuzzy-match the shade word "нарийн" and pull the wrong product.
 "харин", "тэгвэл", "тэгээд", "дараа", "мөн", "юм", "хэрэв", "бол", "гэж", "гэсэн", "гэх", "мэт", "болох", "болно", "болов", "одоо", "өнөөдөр", "маргааш", "дахин", "дахиад", "эсвэл", "бүгд", "бүх", "их", "маш", "за", "аа", "өө", "нэг", "хоёр", "гурав", "ширхэг", "авна", "авмаар", "захиалах", "захиалъя", "захиалга", "хүргэлт", "төлбөр", "данс", "яаж", "хэрэглэх", "түрхэх", "заавар", "найрлага", "бэлэн", "дууссан", "хэзээ", "ургах", "удаа", "өдөр", "буцаах", "солих", "карт", "хүн", "ажилтан", "ярих", "холбогдох", "мл", "тийм", "үгүй", "биш", "худалдаж", "энд", "чатаар", "утас", "нэр", "хаяг", "дүүрэг", "хороо", "байр", "тоот",
 "and", "or", "but", "then", "now", "also", "with", "to", "of", "in", "on", "a", "an", "this", "that", "one", "two", "three", "want", "would", "like", "order", "take", "get", "here", "chat",
]);

/**
 * Latin spellings of Mongolian words, mapped to the Cyrillic word the intent patterns use.
 * Multi-word and glued forms come first so "hedve" becomes "хэд вэ" before "hed" is touched.
 */
const ALIAS_REPLACEMENTS: Array<[RegExp, string]> = [
 [/\b(?:une\s*hed\s*(?:ve|we)|unehedve|unehedwe)\b/gi, "үнэ хэд вэ"],
 [/\b(?:hed\s*(?:ve|we)|hedve|hedwe|hedvee|hedwee)\b/gi, "хэд вэ"],
 [/\b(?:ur\s*dun|urdun|ur\s*dvn)\b/gi, "үр дүн"],
 [/\b(?:bga\s*yu|bgaa\s*yu|bgaayu|baigaayu|bn\s*uu|bnuu|bainuu|baina\s*uu|baigaa\s*yu)\b/gi, "байгаа юу"],
 [/\b(?:vne|une|unee|unei|unii|uniin|unetei|unitei)\b/gi, "үнэ"],
 [/\b(?:hed|hedi|hediin)\b/gi, "хэд"],
 [/\b(?:heden|hedn|hedenn)\b/gi, "хэдэн"],
 [/\b(?:ve|we|vee|wee)\b/gi, "вэ"],
 [/\b(?:yu|yuu)\b/gi, "юу"],
 [/\b(?:uu)\b/gi, "уу"],
 [/\b(?:medeelel|medelel|medeelal)\b/gi, "мэдээлэл"],
 [/\b(?:avay|avya|awy|awya|away|awya|aviy|aviya|avii|avia|awii|avmaar|avmar|avna|avy)\b/gi, "авъя"],
 [/\b(?:avah|avahgsn|avch|avlaa)\b/gi, "авах"],
 [/\b(?:hudaldaj|hudaldan|hudaldaa)\b/gi, "худалдаж"],
 [/\b(?:zahialya|zahialiya|zahialia|zahialna|zahialmaar|zahialmar|zahialy|zahialii)\b/gi, "захиалъя"],
 [/\b(?:zahialj|zahial|zahialah|zahialh|zahialaad)\b/gi, "захиалах"],
 [/\b(?:zahialga|zahialgaa|zahialgiin|zahialgyn|zahialgaar|zahialg)\b/gi, "захиалга"],
 [/\b(?:zahialsan|zahialsn)\b/gi, "захиалсан"],
 [/\b(?:homsog|humsug|homsognii|humsugnii|hömsögnii|homsug|humsog|homsogniih|hömsög|humsugnii)\b/gi, "хөмсөг"],
 [/\b(?:bgaa|baigaa|bga|baina|bn|bna|bnu|bainaa)\b/gi, "байгаа"],
 [/\b(?:belen|belen)\b/gi, "бэлэн"],
 [/\b(?:duussan|duusan|duusn|duuschihsan)\b/gi, "дууссан"],
 [/\b(?:ungu|ongotei|ungutei|ongo|ongu|ungo)\b/gi, "өнгө"],
 [/\b(?:hemjee|hemjeetei|hemje)\b/gi, "хэмжээ"],
 [/\b(?:heregleh|heregledeg|hereglene|hereglej|hergleh|hereglesen|hereglemeer|hereglehed|hereglev)\b/gi, "хэрэглэх"],
 [/\b(?:tureh|turhene|turhej|turhih|turh)\b/gi, "түрхэх"],
 [/\b(?:zaavar|zaawar|zaavriig|zaavr)\b/gi, "заавар"],
 [/\b(?:yaj|yaaj|yj|herhen|yajan)\b/gi, "яаж"],
 [/\b(?:buteegdehuun|buteegdehuunii|buteegdhun|buteegdhuni|buteegdehuuniig|buteegdehuunuud|buteegdhuun|buteegdehvvn)\b/gi, "бүтээгдэхүүн"],
 [/\b(?:hurgelt|hurgeltiin|hurgeltei|hurgeh|hurgej|hurgene|hurgedeg|hurguuleh|hurgeld|hurgelte)\b/gi, "хүргэлт"],
 [/\b(?:ugye|ugie|ugii|ugy|ugiy|ogye)\b/gi, "өгье"],
 [/\b(?:ugh|ugnu|uguh|ugooch|ugne|ogooch|ugch|ugj)\b/gi, "өгөх"],
 [/\b(?:odoo|odo|odoogoor|odoohon)\b/gi, "одоо"],
 [/\b(?:tulbur|tulbor|tolbor|tulburiig|tulbvr|tolboriig)\b/gi, "төлбөр"],
 [/\b(?:tulsun|tulsen|tulchihsen|shiljuulsen|shiljuulchihsen)\b/gi, "төлсөн"],
 [/\b(?:tuluh|tulh|tolh|toloh|tulne|tulj|tulöh)\b/gi, "төлөх"],
 [/\b(?:dans|dansnii|dansni|dansaar|dansan|dansiin)\b/gi, "данс"],
 [/\b(?:hezee)\b/gi, "хэзээ"],
 [/\b(?:garah|garna|garav|garsan|garahve)\b/gi, "гарах"],
 [/\b(?:urgah|urgana|urguulah|urguulna|urgadag|urgalt|urgaad|urguul)\b/gi, "ургах"],
 [/\b(?:serum|syrum|seryum|cerum|serumaa|serumiin|serumiig|seruum|serym)\b/gi, "сэрум"],
 [/\b(?:nairlaga|nairlag|orts|ortsnii|ortsiin)\b/gi, "найрлага"],
 [/\b(?:udaa)\b/gi, "удаа"],
 [/\b(?:udur|odor|udurt|udriin|odort|udriig)\b/gi, "өдөр"],
 [/\b(?:hugatsaa|hugatsaand|hugatsaa)\b/gi, "хугацаа"],
 [/\b(?:butsaah|butsaaj|butsaalt|butsaana|butsaalttai|butsaa)\b/gi, "буцаах"],
 [/\b(?:soliuh|solih|soliulah|solij|solilts|soliulj)\b/gi, "солих"],
 [/\b(?:kart|kartaar|card)\b/gi, "карт"],
 [/\b(?:huntei|hvntei|humuustei)\b/gi, "хүнтэй"],
 [/\b(?:hunii|humuus|hun)\b/gi, "хүн"],
 [/\b(?:ajiltan|ajiltantai|ajilchin|ajiltand)\b/gi, "ажилтан"],
 [/\b(?:yarih|yarii|yarimaar|yarya|yariya)\b/gi, "ярих"],
 [/\b(?:holboo|holbogdoh|holbogdmoor|holbogdoj|holbogdoyo|holbood|holbogdy|holbogdoi)\b/gi, "холбогдох"],
 [/\b(?:hyamdral|hyamdarh|hyamdrah|hyamdraltai|hyamdral)\b/gi, "хямдрал"],
 [/\b(?:hyamd)\b/gi, "хямд"],
 [/\b(?:hamgiin|hamgin)\b/gi, "хамгийн"],
 [/\b(?:gomdol|gomdoltoi)\b/gi, "гомдол"],
 [/\b(?:gemtel|gemteltei)\b/gi, "гэмтэлтэй"],
 [/\b(?:jiremsen|jiremsn)\b/gi, "жирэмсэн"],
 [/\b(?:harshil|harshiltai)\b/gi, "харшил"],
 [/\b(?:ulaih|ulaigaad|ulaisan|ulaij|ulaich)\b/gi, "улайх"],
 [/\b(?:utas|utasnii|utasni|utsaa|utasaa|utsnii)\b/gi, "утас"],
 [/\b(?:tanai|tnai)\b/gi, "танай"],
 [/\b(?:manai)\b/gi, "манай"],
 [/\b(?:shirheg|shirhg|shirhegiig)\b/gi, "ширхэг"],
 [/\b(?:ugui|ugvi|ugyi)\b/gi, "үгүй"],
 [/\b(?:bish)\b/gi, "биш"],
 [/\b(?:tiim|tim|tiimee)\b/gi, "тийм"],
 [/\b(?:bolno|bolnoo)\b/gi, "болно"],
 [/\b(?:bolih|bolino|bolilaa|boliy)\b/gi, "болих"],
 [/\b(?:end|ende)\b/gi, "энд"],
 [/\b(?:chataar|chatar)\b/gi, "чатаар"],
 [/\b(?:ml)\b/gi, "мл"],
 [/\b(?:tos|tosiig|tosnii|tosoo)\b/gi, "тос"],
 [/\b(?:gel|geliig|geli)\b/gi, "гель"],
 [/\b(?:pomad|pomade|pomaad)\b/gi, "помад"],
 [/\b(?:harandaa|harndaa|harandaag|harandaanii|harandaanuud|harandaaa)\b/gi, "харандаа"],
 [/\b(?:bagts|bagtsiig|bagtsan)\b/gi, "багц"],
 [/\b(?:soiz|soizoo)\b/gi, "сойз"],
 [/\b(?:huren)\b/gi, "хүрэн"],
 [/\b(?:tsaivar|caivar)\b/gi, "цайвар"],
 [/\b(?:har)\b/gi, "хар"],
 [/\b(?:ner|neree|nerees)\b/gi, "нэр"],
 [/\b(?:hayag|hayagaa|hayg)\b/gi, "хаяг"],
 [/\b(?:duureg|dvvreg|duuregt)\b/gi, "дүүрэг"],
 [/\b(?:horoo|horoond|horoog)\b/gi, "хороо"],
 [/\b(?:duusgah|duusgaya)\b/gi, "дуусгах"],
];

/** Words a customer types glued together ("unehedve", "odobga"). */
function splitGluedLatin(text: string): string {
  return text
    .replace(/\b(une|vne|serum|tos|gel|pomad)(hed|bga|bgaa|baina|bn|avya|avay|zahialya)\b/gi, "$1 $2")
    .replace(/\b(hed)(ve|we)\b/gi, "$1 $2")
    .replace(/\b(bga|bgaa|baina|bn|bna)(uu|yu)\b/gi, "$1 $2")
    .replace(/\b(odoo|odo)(bga|bgaa|baina|belen)\b/gi, "$1 $2")
    .replace(/\b(hudaldaj)(avya|away|avii|avay)\b/gi, "$1 $2");
}

export function normText(text: string) {
 let normalized = splitGluedLatin(text.normalize("NFKC").toLowerCase());
 for (const [pattern, replacement] of ALIAS_REPLACEMENTS) normalized = normalized.replace(pattern, replacement);
 return normalized.replace(/[+_/\\|()[\],.:;!?«»"'-]+/g, " ").replace(/\s+/g, " ").trim();
}

/** The customer's text and its normalized form together, for intent patterns written in Cyrillic. */
export function intentProbe(text: string): string {
 const normalized = normText(text);
 return normalized === text.toLowerCase() ? text : `${text}\n${normalized}`;
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
 * case suffix — "сэрумын" (genitive of "сэрум") vs "serum" in phonetic space:
 * "serumin".startsWith("serum"). Case endings add letters rather than
 * substitute them, so this is NOT a typo (isOneEditApart's territory). The
 * minimum shared length guards against short tokens prefix-matching by chance.
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
