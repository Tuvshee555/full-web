// Each product, variant, price and order credential is supplied by the caller.
// The same conversations run against fake fixtures and the request-time catalogue.
export function multiTurnScenarios({ products, orderNumber, phone, wrongPhone }) {
  const serum = products.find(p => /serum|серум/i.test(p.productName)) || products[0];
  const pencils = products.filter(p => /pencil|харандаа/i.test(p.productName));
  const pencil = pencils[0] || products[1] || products[0];
  const variant = pencil.sizes?.[0]?.label || "";
  const name = serum.productName;
  const lookupMn = `Захиалгын дугаар ${orderNumber}, утас ${phone}`;
  const lookupEn = `Order ${orderNumber}, phone ${phone}`;
  const turn = (text, intents, options = {}) => ({ text, intents: Array.isArray(intents) ? intents : [intents], ...options });
  const scenario = (id, locale, turns) => ({ id, locale, turns });
  return [
    scenario("review-1-mn-handoff-then-shop", "mn", [turn("Сайн байна уу", "greeting"), turn("Хөмсөг нимгэн, ургуулах юм байна уу?", ["medical", "recommend"]), turn("Үнэ хэд вэ?", ["price", "clarify"]), turn("Хэд хоногт хүргэх вэ?", "delivery"), turn("Хотын төвд хүргэлт хэд вэ", "delivery"), turn("За тэгвэл яаж захиалах вэ", ["ordering", "payment"])]),
    scenario("review-2-latin-growth-then-price", "mn", [turn("hömsögnii serum bgaa yu", ["catalogue", "availability", "product"]), turn("une ni hed ve", ["price", "clarify"]), turn("hed hongiin dotor urgah ve", "medical"), turn("hurgelt hed ve", "delivery"), turn("yaj zahialah ve", ["ordering", "payment"])]),
    scenario("review-3-colours-and-discount", "mn", [turn("харандаа ямар өнгөтэй байгаа", ["variants", "sizes"]), turn(variant ? `${variant} нь байна уу` : `${pencil.productName} байна уу`, ["availability", "variants", "clarify"]), turn("2-ыг авбал хямдрах уу", "discount"), turn("Яаж захиалах вэ", ["ordering", "payment"])]),
    scenario("review-4-english-product-and-card", "en", [turn("do you have something for sparse brows?", "recommend"), turn("how do I use it?", ["howTo", "clarify"]), turn("the first one", ["product", "price", "clarify"]), turn("can I pay by card?", "payment", { card: true }), turn("What does delivery cost?", "delivery")]),
    scenario("review-5-complaint-then-private-order", "mn", [turn("Би 2 хоногийн өмнө захиалсан ирэхгүй байна", ["order", "orderComplaint"]), turn(lookupMn, "order", { order: "correct" }), turn("Хүргэлтийн төлбөр хэд вэ", "delivery"), turn("За баярлалаа", "thanks")]),
    scenario("review-6-chitchat-and-missing-product", "mn", [turn("Чамайг хэн хийсэн бэ", ["chitchat", "unknown"]), turn("нүүрний тос байгаа юу", ["notInCatalog", "unknown"]), turn("Ямар бүтээгдэхүүн байгаа вэ", "catalogue"), turn("Үнэ хэд вэ", ["price", "clarify"])]),
    scenario("mn-numbered-list", "mn", [turn("Ямар бүтээгдэхүүнүүд байгаа вэ", "catalogue"), turn("эхнийх нь", ["product", "price", "clarify"]), turn("хэрхэн хэрэглэх вэ", "howTo"), turn("үнэ хэд вэ", "price")]),
    scenario("en-numbered-list", "en", [turn("List your products", "catalogue"), turn("1", ["product", "price", "clarify"]), turn("How do I use it?", "howTo"), turn("Is it available?", "availability")]),
    scenario("latin-numbered-list", "mn", [turn("yamar buteegdehuun bgaa ve", "catalogue"), turn("ehnii ni", ["product", "price", "clarify"]), turn("heregleh zaavar", "howTo"), turn("une hed ve", "price")]),
    scenario("mn-explicit-handoff-continues", "mn", [turn("Хүнтэй холбогдмоор байна", "handoff", { human: true }), turn("Хүргэлт хэд вэ", "delivery"), turn(`${name} үнэ хэд вэ`, "price"), turn("Банкны дансны дугаар өгөөч", "bank")]),
    scenario("en-explicit-handoff-continues", "en", [turn("I want a human", "handoff", { human: true }), turn("What is delivery cost?", "delivery"), turn(`What is the price of ${name}?`, "price"), turn("Can I use QPay?", "payment")]),
    scenario("latin-explicit-handoff-continues", "mn", [turn("huntei holbogdmoor baina", "handoff", { human: true }), turn("hurgelt hed ve", "delivery"), turn(`${name} une hed ve`, "price"), turn("dansnii dugaar", "bank")]),
    scenario("en-medical-no-promise", "en", [turn(`Do you have ${name}?`, ["product", "availability"]), turn("Will it regrow my brows in two weeks?", "medical"), turn("How much is it?", "price"), turn("How do I order?", ["ordering", "payment"])]),
    scenario("mn-medical-no-promise", "mn", [turn(`${name} байгаа юу`, ["product", "availability"]), turn("Хоёр долоо хоногт хөмсөг ургах уу", "medical"), turn("үнэ хэд вэ", "price"), turn("хүргэлт хэд вэ", "delivery")]),
    scenario("en-card-and-bank", "en", [turn("Can I pay by card?", "payment", { card: true }), turn("How can I pay?", "payment"), turn("Bank account please", "bank"), turn("How do I order?", ["ordering", "payment"])]),
    scenario("mn-discount-no-invention", "mn", [turn(`${name} үнэ хэд вэ`, "price"), turn("2-ыг авбал хямдрах уу", "discount"), turn("Тэгвэл нэг нь хэд вэ", "price"), turn("QPay болох уу", "payment")]),
    scenario("en-unlisted-product", "en", [turn("Do you sell face cream?", ["notInCatalog", "unknown"]), turn("What do you sell?", "catalogue"), turn("the first one", ["product", "price", "clarify"]), turn("What sizes are available?", ["variants", "sizes"])]),
    scenario("en-order-wrong-and-right-phone", "en", [turn("My order hasn't arrived", ["order", "orderComplaint"]), turn(`Order ${orderNumber}, phone ${wrongPhone}`, "order", { order: "wrong" }), turn(lookupEn, "order", { order: "correct" }), turn("Thanks", "thanks")]),
    scenario("mn-order-credentials-separated", "mn", [turn("Захиалгын төлөв шалгамаар байна", "order"), turn(`Захиалгын дугаар ${orderNumber}`, "order", { order: "missing" }), turn(`Утас ${phone}`, "order", { order: "correct" }), turn("Баярлалаа", "thanks")]),
    scenario("en-chitchat-topic-change", "en", [turn("Who made you?", ["chitchat", "unknown"]), turn("Hello", "greeting"), turn(`What is the price of ${name}?`, "price"), turn("Thank you", "thanks")]),
    scenario("mn-colour-followup-topic-change", "mn", [turn(`${pencil.productName} ямар өнгөтэй вэ`, ["variants", "sizes"]), turn(variant ? `${variant} байна уу` : "Бэлэн байгаа юу", ["availability", "variants"]), turn(`${name} үнэ хэд вэ`, "price"), turn("хэрхэн хэрэглэх вэ", "howTo")]),
  ];
}
