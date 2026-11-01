// Invented catalogue for the chatbot evaluation. Names, prices, phone numbers and policies are
// test values only; the shapes mirror the live shop (Product + ProductSize + knowledge fields).
// The catalogue is mutable so a case can change a price, a stock count or a policy between
// turns, the way an admin edit would, and check that the next reply uses the new value.

export const FEE = 7000;
export const SITE = "https://shop.example.invalid";
export const ORDER = { number: "EV00001", phone: "00000001", wrongPhone: "00000002", status: "PAID", privateMarker: "EVAL_PRIVATE_ADDRESS" };

const VERIFIED_AT = "2026-11-02T00:00:00.000Z";
/** A product whose published facts the (invented) owner has verified; the assistant quotes only verified facts. */
function product(p) {
  const base = { oldPrice: null, discount: null, ingredients: "", category: null, sizes: [], volume: null, howToUse: null, ingredientList: null, safetyNotes: null, storage: null, usageFrequency: null, faq: [], ...p };
  const verifiedFacts = {};
  if (base.volume) verifiedFacts.volume = VERIFIED_AT;
  if (base.howToUse) verifiedFacts.usage = VERIFIED_AT;
  if (base.ingredientList) verifiedFacts.ingredients = VERIFIED_AT;
  if (base.safetyNotes) verifiedFacts.safety = VERIFIED_AT;
  if (base.storage) verifiedFacts.storage = VERIFIED_AT;
  if (base.usageFrequency) verifiedFacts.frequency = VERIFIED_AT;
  return { ...base, verifiedFacts: { ...verifiedFacts, ...(p.verifiedFacts || {}) } };
}

export function freshCatalogue() {
  return {
    serum: product({
      id: "ev-serum", productName: "Хөмсөгний сэрум", price: 61000, category: { categoryName: "Хөмсөгний арчилгаа" },
      ingredients: "Хөмсөгний өдөр тутмын арчилгаанд зориулсан сэрум.", sizes: [{ id: "ev-serum-5", label: "5 мл", price: null, stock: null }],
      volume: "5 мл",
      howToUse: "Орой цэвэр, хуурай хөмсөгт үсний ургалтын дагуу нимгэн түрхэнэ.\nӨдөрт нэг удаа хэрэглэнэ.\nНүдэнд хүргэхгүй байна уу.",
      ingredientList: "Aqua, Glycerin, Panthenol, Test Peptide Complex",
      faq: [{ q: "Хэдий хугацаанд хэрэглэх вэ?", a: "Тасралтгүй 8 долоо хоног хэрэглэхийг зөвлөдөг." }],
      safetyNotes: "Нүдэнд орвол усаар зайлна.",
      storage: "Сэрүүн, нарны гэрэлгүй газар таглаатай хадгална.",
      usageFrequency: "Өдөрт нэг удаа, орой",
    }),
    pencilA: product({
      id: "ev-pencil-a", productName: "Нарийн хөмсөгний харандаа", price: 23000, category: { categoryName: "Харандаа ба помад" },
      ingredients: "Нарийн үзүүртэй, нөгөө талдаа сойзтой харандаа.",
      sizes: [{ id: "ev-pa-light", label: "Цайвар хүрэн", price: null, stock: 2 }, { id: "ev-pa-brown", label: "Хүрэн", price: null, stock: 0 }, { id: "ev-pa-dark", label: "Хар хүрэн", price: null, stock: null }],
      howToUse: "Үс шиг нарийн зураасаар хоосон хэсгийг нөхнө.\nСойзоор зөөлөн самнана.",
    }),
    pencilB: product({
      id: "ev-pencil-b", productName: "Модон хөмсөгний харандаа", price: 18000, category: { categoryName: "Харандаа ба помад" },
      ingredients: "Ирлэх боломжтой модон харандаа.",
      sizes: [{ id: "ev-pb-light", label: "Цайвар хүрэн", price: null, stock: null }, { id: "ev-pb-brown", label: "Хүрэн", price: null, stock: null }, { id: "ev-pb-dark", label: "Хар хүрэн", price: null, stock: null }],
    }),
    gel: product({ id: "ev-gel", productName: "Тунгалаг хөмсөгний гель", price: 31000, category: { categoryName: "Хэлбэржүүлэх" }, ingredients: "Хөмсөгийг хэлбэрт нь тогтоох гель.", volume: "6 мл" }),
    pomade: product({
      id: "ev-pomade", productName: "Хөмсөгний помад", price: 36000, category: { categoryName: "Харандаа ба помад" }, ingredients: "Хоосон хэсгийг нөхөж хэлбэр гаргах помад.",
      sizes: [{ id: "ev-po-light", label: "Цайвар хүрэн", price: null, stock: null }, { id: "ev-po-dark", label: "Хар хүрэн", price: null, stock: null }],
    }),
    set: product({ id: "ev-set", productName: "Хөмсөгний багц", price: 95000, oldPrice: 110000, discount: 14, category: { categoryName: "Багц" }, ingredients: "Сэрум, гель, харандаа нэг багцад." }),
    oil: product({ id: "ev-oil", productName: "Хөмсөгний тос", price: 41000, category: { categoryName: "Хөмсөгний арчилгаа" }, ingredients: "Хөмсөг тэжээх ургамлын тос.", sizes: [{ id: "ev-oil-10", label: "10 мл", price: null, stock: null }], volume: "10 мл" }),
    brush: product({ id: "ev-brush", productName: "Налуу сойз", price: 15000, category: { categoryName: "Багаж хэрэгсэл" }, ingredients: "Помад түрхэх нимгэн налуу сойз." }),
  };
}

export function freshPolicies() {
  return {
    mn: { delivery: "Тест: Улаанбаатарт 1–2 ажлын өдөр, орон нутагт 2–5 ажлын өдөрт хүрнэ.", returns: "Тест: нээсэн бүтээгдэхүүнийг буцаахгүй; гэмтэлтэй ирсэн бол 24 цагийн дотор холбогдоно уу.", safety: "Тест: эхлээд жижиг хэсэгт туршиж үзээрэй." },
    en: { delivery: "Test: 1–2 working days in Ulaanbaatar, 2–5 in the countryside.", returns: "Test: opened products cannot be returned; contact us within 24 hours if damaged.", safety: "Test: patch test on a small area first." },
  };
}

export function freshSettings() {
  return {
    enabled: true, metaOutbound: false,
    greetingMn: "Сайн байна уу! Тест дэлгүүрийн бүтээгдэхүүн, хүргэлт, захиалгын талаар асуугаарай.",
    greetingEn: "Hello! Ask about test shop products, delivery or your order.",
    handoffMn: "Таны хүсэлтийг ажилтанд хадгаллаа. Нэр, холбогдох утсаа үлдээнэ үү.",
    handoffEn: "Your request has been saved for our team. Please leave your name and phone number.",
    lowStockThreshold: 5, showExactStock: false, extraKnowledgeMn: "", extraKnowledgeEn: "",
    chatOrdersEnabled: true, handoverAutoResumeHours: 24, aiModel: "", aiDailyBudgetUsd: 5,
  };
}

/** Shop-level FAQ the owner edits in the admin (ChatFaq rows). */
export function freshShopFaq() {
  return [
    { id: "ev-faq-1", question: "Ажлын цаг хэд вэ?", answer: "Тест: Даваа–Баасан 10:00–18:00 цагт ажиллана.", questionEn: "What are your opening hours?", answerEn: "Test: Monday to Friday, 10:00–18:00.", enabled: true, sortOrder: 1 },
  ];
}

export class EvalWorld {
  constructor() { this.reset(); }
  reset() { this.catalogue = freshCatalogue(); this.policies = freshPolicies(); this.settings = freshSettings(); this.shopFaq = freshShopFaq(); this.fee = FEE; }
  products() { return Object.values(this.catalogue); }
  /** The catalogue read at the start of a turn, as handler.ts reads it from the database. */
  context(locale = "mn") {
    const products = structuredClone(this.products());
    const policies = this.policies[locale];
    const content = { default: {} };
    for (const p of products) {
      const verified = p.verifiedFacts || {};
      content[p.id] = {
        ...(p.howToUse && verified.usage ? { howTo: p.howToUse.split("\n").map((s) => s.trim()).filter(Boolean) } : {}),
        ...(p.ingredientList && verified.ingredients ? { fullIngredients: p.ingredientList } : {}),
        ...(p.usageFrequency && verified.frequency ? { frequency: p.usageFrequency } : {}),
        ...(p.storage && verified.storage ? { storage: p.storage } : {}),
        ...(p.safetyNotes && verified.safety ? { safety: p.safetyNotes } : {}),
        ...(p.faq?.length ? { faq: p.faq } : {}),
      };
    }
    const faq = [
      { q: locale === "en" ? "How long does delivery take?" : "Хүргэлт хэдэн хоногт хүрэх вэ?", a: policies.delivery },
      { q: locale === "en" ? "Can I return a product?" : "Бүтээгдэхүүнээ буцаах боломжтой юу?", a: policies.returns },
      { q: locale === "en" ? "How should I try a new product?" : "Шинэ бүтээгдэхүүнийг хэрхэн туршиж үзэх вэ?", a: policies.safety },
      ...this.shopFaq.filter((f) => f.enabled).map((f) => (locale === "en" && f.questionEn ? { q: f.questionEn, a: f.answerEn || f.answer } : { q: f.question, a: f.answer })),
    ];
    return {
      products, settings: structuredClone(this.settings), locale, site: SITE, deliveryFee: this.fee,
      store: { contact: { phone: "00000000", email: "test@example.invalid" }, bank: { name: "Тест банк", holder: "Тест дэлгүүр", account: "0000000000" } },
      brand: { faq, about: ["Тест дэлгүүрийн тухай мэдээлэл."] },
      content,
      policies,
    };
  }
  /** Every amount the bot may legitimately quote right now. */
  quotable() {
    const amounts = new Set([this.fee]);
    for (const p of this.products()) { amounts.add(p.price); if (p.oldPrice) amounts.add(p.oldPrice); for (const s of p.sizes) if (s.price) amounts.add(s.price); }
    return amounts;
  }
  mutate(change) {
    if (change.price) { const [key, price] = change.price; this.catalogue[key].price = price; }
    if (change.oldPrice) { const [key, oldPrice] = change.oldPrice; this.catalogue[key].oldPrice = oldPrice; }
    if (change.stock) { const [key, label, stock] = change.stock; const size = this.catalogue[key].sizes.find((s) => s.label === label); if (size) size.stock = stock; }
    if (change.howToUse) { const [key, text] = change.howToUse; this.catalogue[key].howToUse = text; }
    if (change.description) { const [key, text] = change.description; this.catalogue[key].ingredients = text; }
    if (change.volume) { const [key, text] = change.volume; this.catalogue[key].volume = text; this.catalogue[key].verifiedFacts = { ...this.catalogue[key].verifiedFacts, volume: VERIFIED_AT }; }
    if (change.howToUse) { const [key] = change.howToUse; this.catalogue[key].verifiedFacts = { ...this.catalogue[key].verifiedFacts, usage: VERIFIED_AT }; }
    if (change.verified) { const [key, facts] = change.verified; this.catalogue[key].verifiedFacts = facts; }
    if (change.delivery) { this.policies.mn.delivery = change.delivery.mn; this.policies.en.delivery = change.delivery.en; }
    if (change.fee !== undefined) this.fee = change.fee;
    if (change.settings) Object.assign(this.settings, change.settings);
    if (change.shopFaq) this.shopFaq = change.shopFaq;
  }
}
