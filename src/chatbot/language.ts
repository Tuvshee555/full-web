import { stripProductNamesForIntent } from "./customerTurn";
import type { CatalogProduct, Locale } from "./types";
export function detectLanguage(text: string, previous: string = "mn", products: CatalogProduct[] = []): Locale {
  const turn = stripProductNamesForIntent(text, products).normalize("NFKC");
  if (/[а-яөүё]/iu.test(turn)) return "mn";
  if (/\b(sain|sn|baina|bnu|bgaa|baigaa|une|vne|unetei|hed|hedi|hemjee|hurgelt|tulbur|zahialga|zahial|humsug|homsog|h[oö]ms[oö]gnii|buteegdehuun|hun|holbo|orts|bayarlalaa|duussan|tureh|heregleh|dans|avah|uguh|yaj|boloh|yu|belen|urgah|hongiin|avbal|hyamdrah)\b/iu.test(turn)) return "mn";
  if (/\b(hi|hello|price|cost|size|stock|how|what|when|where|which|can|could|want|please|order|human|thanks|delivery|payment|bank|ingredients|recommend|brows|serum|available|pay|refund|show|tell|about|the|it|does|is|first|colour|color|pencil)\b/iu.test(turn)) return "en";
  return previous === "en" ? "en" : "mn";
}
