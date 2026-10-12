import { sanitizeAssistantReply, stripRepeatedGreeting } from "./reply";


export const CHATBOT_REPLY_RULES = [
  "Answer the customer's current question first. Be polite and natural, without empty enthusiasm or repeating the question.",
  "For one fact, normally use 1-3 short lines. For multiple questions, answer every requested part in a compact list. Essential product conditions must never be omitted to meet a length budget.",
  "Show only the requested product and variant facts. Do not add unrelated ingredients, instructions or offers.",
  "Ask at most one necessary clarification at a time. Use the known product/variant/order credentials; never ask again for information already provided.",
  "Offer at most three options initially, and say more options exist when relevant. Show the full list when explicitly requested.",
  "Usage requests get the published instructions or product link. Send photos only when requested.",
  "Use zero or one relevant emoji, not emoji headings on every line. Do not repeat greetings or pressure customers for contact information.",
  "If the customer asks again, answer again. Never scold them or replace the answer with 'already answered'.",
  "Never promise a reservation, refund, staff callback or completed handoff unless the application has actually confirmed that action. Keep each customer's private information separate.",
] as const;

export function replyPreferences(text:string) {
 const full=/бүх|бүгд|дэлгэрэнгүй|бүтэн|all\b|full\b|detailed|bugd|delgerengui|buten/i.test(text);
 return {full,optionLimit:full?Infinity:3};
}
export function compactReplyOptions(options:string[],text:string,locale="mn"):string[] {
 const limit=replyPreferences(text).optionLimit;const unique=[...new Set(options)];
 return [...unique.slice(0,limit),...(unique.length>limit?[locale==="en"?`${unique.length-limit} more options are available.`:`Өөр ${unique.length-limit} сонголт бий.`]:[])];
}
export function presentAssistantReply(input:{reply:string;userText:string;hasPriorReply?:boolean;phoneAlreadyRequested?:boolean}):string {
 if(/^(?:REFER|SILENT)$/i.test(input.reply.trim()))return input.reply.trim();
 let reply=stripRepeatedGreeting(sanitizeAssistantReply(input.reply),Boolean(input.hasPriorReply));
 const wantsContact=/захиал|залга|холбо|ажилтан|оператор|book\b|call\b|human|zahial|holbo/i.test(input.userText);
 if(input.phoneAlreadyRequested||!wantsContact){
 const lines=reply.split("\n");const filtered=lines.filter((line)=>!/^\s*(?:утасны\s+дугаараа|дугаараа\s+үлдээ|please\s+(?:leave|share)\s+your\s+phone)/i.test(line));
 if(filtered.some((line)=>line.trim()))reply=filtered.join("\n");
 }
 let emojis=0;
 reply=reply.replace(/https?:\/\/\S+|\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*/gu,(value)=>value.startsWith("http")||++emojis<=1?value:"");
 return reply.replace(/[ \t]+\n/g,"\n").replace(/\n{3,}/g,"\n\n").trim();
}