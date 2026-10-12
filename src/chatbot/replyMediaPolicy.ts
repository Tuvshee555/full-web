import { recordCounter } from "./observability";
export function getReplyMediaPolicy(userText: string, replyText: string) {
  const reason = !replyText.trim() || /^(REFER|SILENT)$/i.test(replyText.trim())
    ? "silent_reply"
    : /аль\s+бүтээгдэхүүн|which product/i.test(replyText)
      ? "ambiguous_reply"
      : !/зураг|zurag|photos?|images?|pictures?/i.test(userText) && !/\b(?:gallery|album)\b|цомог|галерей/i.test(userText)
        ? "no_media_intent"
        : "explicit_media";
  const fullGallery = /\b(?:all|full|entire)\s+(?:(?:the|trip)\s+)?(?:photos?|images?|pictures?|gallery|album)\b|\b(?:photos?|images?|pictures?)\s+all\b|\b(?:buh|bugd)\s+zurag|бүх\s+зур(?:аг|г)|зур(?:аг|г)\S*\s+бүгд|бүтэн\s+(?:цомог|галерей)/i.test(userText.normalize("NFKC"));
  return { allowed: reason === "explicit_media", reason, photoLimit: fullGallery ? 10 : 3 };
}

export function limitReplyPhotos(urls: string[], limit: number): string[] {
  return Array.from(new Set(urls)).filter((url) => {
    try { return new URL(url).protocol === "https:"; } catch { return false; }
  }).slice(0, limit);
}

export function recordReplyMediaDelivery(kind: "photo" | "product_link", outcome: "attempted" | "sent" | "failed", count = 1) {
  if (count > 0) recordCounter("webhook.product_media_delivery_total", count, { kind, outcome });
}
