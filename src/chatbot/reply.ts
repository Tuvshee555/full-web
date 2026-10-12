import type { CatalogueContext } from "./types";
import type { ProductAnswerPlan } from "./productAnswerPlan";
import { money } from "./productPriceBlock";
import { unsafeClaim } from "./productFacts";
export function isReferReply(text: string): boolean {
 const firstLine=(text||"").trim().split("\n")[0]?.trim().toUpperCase()||"";
 return firstLine==="REFER"||firstLine==="SILENT"||/^(REFER|SILENT)\b/.test(firstLine);
}
export type ReplyPlan={intent:string;productPlan?:ProductAnswerPlan|null;hasOrderCredentials?:boolean;orderStatus?:string|null;handoffAcknowledged?:boolean};
export function contactFallback(context:CatalogueContext):string {
 const contact=[context.store.contact.phone,context.store.contact.email].filter(Boolean).join(" · ");
 return (context.locale==="en"?"I cannot confirm that detail right now. Our team can help: ":"Одоогоор тэр мэдээллийг баталгаажуулж чадсангүй. Манай ажилтнаас тодруулна уу: ")+contact;
}
const STATUSES:Record<string,[string,string]>={PENDING:["Баталгаажуулалт хүлээж байна","Awaiting confirmation"],WAITING_PAYMENT:["Төлбөр хүлээж байна","Awaiting payment"],COD_PENDING:["Баталгаажуулалт хүлээж байна","Awaiting confirmation"],PAID:["Төлбөр төлөгдсөн","Paid"],DELIVERING:["Хүргэлтэд гарсан","On the way"],DELIVERED:["Хүргэгдсэн","Delivered"],CANCELLED:["Цуцлагдсан","Cancelled"]};
export function composeReply(plan:ReplyPlan,context:CatalogueContext):{text:string;needsHuman:boolean} {
 const say=(mn:string,en:string)=>context.locale==="en"?en:mn;
 if(plan.productPlan)return {text:plan.productPlan.reply,needsHuman:plan.productPlan.status==="handoff"};
 let text="";let needsHuman=false;
 switch(plan.intent){
 case "greeting":text=context.locale==="en"?context.settings.greetingEn:context.settings.greetingMn;break;
 case "thanks":text=say("Зүгээр ээ. Өөр асуух зүйл байвал бичээрэй.","You're welcome. Let me know if you have another question.");break;
 case "delivery":{
 const faq=context.brand.faq.find((item)=>/delivery|хүргэлт/i.test(item.q));
 text=say(`Хүргэлтийн төлбөр: ${money(context.deliveryFee)}.`,`Delivery fee: ${money(context.deliveryFee)}.`)+(faq?"\n"+faq.a:"");break;}
 case "payment":text=say("Картаар төлөх боломжгүй. Зөвхөн QPay эсвэл банкны шилжүүлгээр төлнө. Бүтээгдэхүүнээ сагсанд нэмээд захиалгаа баталгаажуулна.","Cards are not accepted. Pay with QPay or bank transfer. Add products to your cart, then complete checkout.")+`\n${context.site}/${context.locale}/cart\n${context.site}/${context.locale}/checkout`;break;
 case "bank":text=say("Банкны шилжүүлэг:","Bank transfer:")+`\n${context.store.bank.name}\n${context.store.bank.holder}\n${context.store.bank.account}\n`+say("Гүйлгээний утгад захиалгын дугаараа бичнэ үү.","Use your order number as the payment reference.");break;
 case "order":text=!plan.hasOrderCredentials?say("Захиалгын дугаар болон тухайн захиалгад бүртгэсэн утасны дугаараа хамт бичнэ үү.","Please provide your order number and the phone number registered on that order."):plan.orderStatus&&STATUSES[plan.orderStatus]?say("Захиалгын төлөв: ","Order status: ")+STATUSES[plan.orderStatus][context.locale==="en"?1:0]:say("Захиалгын дугаар, утасны мэдээллийг баталгаажуулж чадсангүй. Хоёуланг нь шалгаад дахин бичнэ үү.","I could not verify the order number and phone number. Please check both and try again.");break;
 case "returns":{const faq=context.brand.faq.find((item)=>/return|буцаа/i.test(item.q));text=faq?.a||contactFallback(context);needsHuman=!faq;break;}
 case "about":text=context.brand.about.join("\n");break;
 case "contact":text=[context.store.contact.phone,context.store.contact.email].filter(Boolean).join(" · ");break;
 case "medical":text=say("Үс ургалт, хугацаа, эмчилгээний үр дүнг батлах мэдээлэл байхгүй. Энэ талаар манай ажилтнаас тодруулж болно.","We have no verified growth timeframe or medical result to promise. Our team can help with this question.");needsHuman=true;break;
 case "human":needsHuman=true;text=plan.handoffAcknowledged?say("Таны хүсэлтийг ажилтанд өмнө нь хадгалсан. Би бусад асуултад тань тусалж болно.","Your request is saved for our team. I can still help with your other questions."):(context.locale==="en"?context.settings.handoffEn:context.settings.handoffMn);break;
 case "knowledge":{const knowledge=context.locale==="en"?context.settings.extraKnowledgeEn:context.settings.extraKnowledgeMn;text=knowledge&&!unsafeClaim(knowledge)&&!/₮|\bMNT\b|stock|нөөц|хямдрал|discount|price|үнэ/i.test(knowledge)?knowledge:contactFallback(context);break;}
 case "clarify":text=say("Аль бүтээгдэхүүн бэ? Нэр эсвэл төрлийг нь бичнэ үү.","Which product do you mean? Please share its name or type.");break;
 case "outside":text=say("Тэр бүтээгдэхүүн одоогийн каталогт байхгүй байна. Манай хөмсөгний бүтээгдэхүүнээс сонгоход тусалж болно.","That product is not listed in our current catalogue. I can help you choose from our eyebrow products.");break;
 default:text=say("Би Lorentz-ийн онлайн туслах. Бүтээгдэхүүн, үнэ, хүргэлт, захиалгын талаар тусалж болно.","I'm Lorentz's online assistant. I can help with products, prices, delivery and orders.");
 }
 return {text:text||contactFallback(context),needsHuman};
}
function stripLeakedPlaceholders(text: string): string {
  return text.replace(/\[Чиглэл\]\s*/gi, "");
}

function stripMarkdown(text: string): string {
  return text
    // [link text](url) → just the url
    .replace(/\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g, "$2")
    // **bold** or __bold__ → plain
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    // *italic* or _italic_ → plain
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    // # headers → plain
    .replace(/^#{1,6}\s+/gm, "")
    // bullet points * or - at line start → plain
    .replace(/^[\*\-]\s+/gm, "")
    // dedupe consecutive identical URLs on separate lines
    .replace(/(https?:\/\/[^\s]+)\n\1/g, "$1");
}

function stripControlTokens(text: string): string {
  return text
    .replace(/(^|\s)\b(?:REFER|SILENT)\b(?=\s|$)/gi, " ")
    .replace(/[ \t]{2,}/g, " ");
}

function stripScoldingRepeatPhrases(text: string): string {
  return text
    .replace(/[^.\n!?]*өмнө нь хэлсэн[^.\n!?]*[.!?]?/gi, "")
    .replace(/[^.\n!?]*as I mentioned[^.\n!?]*[.!?]?/gi, "")
    .replace(/[^.\n!?]*already (?:told|shared)[^.\n!?]*[.!?]?/gi, "");
}

function normalizeWhitespace(text: string) {
  return text.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function normalizeForCompare(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function isGreetingBlock(text: string) {
  const normalized = normalizeForCompare(text);
  return (
    normalized.startsWith("сайн байна") ||
    normalized.startsWith("сайн уу") ||
    normalized.startsWith("тавтай морил") ||
    normalized.startsWith("hello") ||
    normalized.startsWith("hi ")
  );
}

export function sanitizeAssistantReply(text: string) {
  const withoutInternalVocabulary = text
    .replace(/\bContext-(?:д|т)/gi, "манай бүтээгдэхүүний мэдээлэлд")
    .replace(/\bContext\b/gi, "бүтээгдэхүүний мэдээлэл");
  const cleaned = normalizeWhitespace(stripScoldingRepeatPhrases(stripControlTokens(stripMarkdown(stripLeakedPlaceholders(withoutInternalVocabulary)))));
  if (!cleaned) return "Энэ мэдээлэл одоогоор тодорхойгүй байна. Хүний ажилтантай холбож өгье.";

  // Split on blank lines (paragraph breaks) — preserve them so the AI's
  // line-by-line trip details format (price on one line, date on next, etc.)
  // is kept intact when sent to Messenger.
  const blocks = cleaned.split(/\n\n+/);
  const dedupedBlocks: string[] = [];
  const seenBlocks = new Set<string>();

  for (const block of blocks) {
    // Lines are deduplicated within their own paragraph only. Uudam lesson: a price line repeated
    // under a DIFFERENT departure heading was a real fact about that departure, and deleting it
    // dropped real fares. Lorentz has the same shape: "Хар хүрэн — захиалах боломжтой" under a second
    // product is a fact about that product. A whole paragraph repeated verbatim is still dropped.
    const lines = block.split("\n");
    const uniqueLines: string[] = [];
    const seenLinesInBlock = new Set<string>();
    for (const line of lines) {
      const norm = normalizeForCompare(line);
      if (!norm) continue;
      if (seenLinesInBlock.has(norm)) continue;
      seenLinesInBlock.add(norm);
      uniqueLines.push(line.trim());
    }
    const paragraph = uniqueLines.join("\n");
    const paragraphKey = normalizeForCompare(paragraph);
    if (paragraph && !seenBlocks.has(paragraphKey)) {
      seenBlocks.add(paragraphKey);
      dedupedBlocks.push(paragraph);
    }
  }

  return dedupedBlocks.join("\n\n").trim() || "Энэ мэдээлэл одоогоор тодорхойгүй байна. Хүний ажилтантай холбож өгье.";
}

export function stripRepeatedGreeting(replyText: string, hasPriorAssistantReply: boolean) {
  if (!hasPriorAssistantReply) return replyText;
  const blocks = replyText.split(/\n\n+/).map((block) => block.trim()).filter(Boolean);
  if (blocks.length <= 1) return replyText;
  if (!isGreetingBlock(blocks[0])) return replyText;
  return blocks.slice(1).join("\n\n").trim();
}

