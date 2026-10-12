type Attachment = { type?: string; payload?: { url?: string } };
const ATTACHMENT_LABELS: Record<string, string> = { image: "зураг", video: "видео", audio: "дуут мессеж", file: "файл" };
// The source attachment acknowledgement feeds the shared engine. Customer
// documents and image OCR are dropped; no attachment is treated as payment proof.
export function attachmentOnlyText(attachments: Attachment[]) {
  const kinds = Array.from(new Set(attachments.map((a) => ATTACHMENT_LABELS[a?.type || ""] || "файл")));
  return `[Хэрэглэгч ${kinds.join(", ")} илгээсэн] Ажилтнаар шалгуулах хүсэлтэй.`;
}
export function extractImageAttachmentUrls(attachments: Attachment[]) {
  return attachments.filter((a) => a?.type === "image" && typeof a?.payload?.url === "string").map((a) => String(a.payload?.url || "").trim()).filter((url) => url.startsWith("https://"));
}
