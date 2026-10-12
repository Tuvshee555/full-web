import type { ConversationState } from "./types";
export const normalizePhone = (value: unknown) => {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("976") ? digits.slice(3) : digits;
};
export function contactDetails(text: string): { phone: string; name: string } {
  const phone = text.match(/(?:\+?976[ -]?)?\b\d{8}\b/)?.[0] || "";
  const name = text.match(/(?:миний нэр|намайг|name(?: is)?|ner)\s*[:：]?\s*([\p{L} '-]{2,60})/iu)?.[1]?.trim() || "";
  return { phone: normalizePhone(phone), name };
}
export function orderCredentials(text: string, state: ConversationState): { orderNumber: string; phone: string; hasOrderCredentials: boolean } {
  const supplied = /(?:захиалгын\s*(?:дугаар|д[уы]гаар)|захиалга|zahialg(?:iin|yn)?\s*(?:dugaar)?|order\s*(?:number|no\.?|#)?|#)\s*[:：#]?\s*([A-Z0-9][A-Z0-9-]{3,50})/iu.exec(text)?.[1] || "";
  const prior = typeof state.pendingOrderNumber === "string" ? state.pendingOrderNumber : "";
  const orderNumber = supplied || prior;
  const phone = contactDetails(text).phone || (supplied && supplied !== prior ? "" : typeof state.pendingOrderPhone === "string" ? state.pendingOrderPhone : "");
  return { orderNumber, phone, hasOrderCredentials: Boolean(orderNumber && /^\d{8}$/.test(phone)) };
}
