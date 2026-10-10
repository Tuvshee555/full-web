// One place for the storefront's name and fixed copy. Change the brand here
// and the header, footer, checkout and product "vendor" line all follow.
import { DELIVERY_FEE } from "@/data/mongoliaLocations";

export const STORE = {
  name: "Lorentz",
  // Shown in the thin bar above the header (rotates if there is more than one)
  announcements: {
    mn: [
      `Улаанбаатар болон орон нутагт хүргэлттэй · ${DELIVERY_FEE.toLocaleString()}₮`,
      "QPay болон дансаар төлөх боломжтой",
    ],
    en: [
      `Delivery across Ulaanbaatar and the countryside · ${DELIVERY_FEE.toLocaleString()}₮`,
      "Pay with QPay or bank transfer",
    ],
  } as Record<string, string[]>,
  // Shown after a customer picks "Bank transfer" at checkout
  bank: {
    name: "Хаан банк",
    holder: "Түвшинсайхан IBAN данс",
    account: "230005005653699009",
  },
  social: {
    facebook: "",
    instagram: "",
  },
  // Contact page. Empty fields are simply not shown.
  contact: {
    phone: "86185769",
    email: "ganturtuvshinsaihan@gmail.com",
    messenger: "", // e.g. https://m.me/yourpage (add when the page exists)
    address: "",
  },
};

/** Checkout buttons/links: brand ink (Shopify default would be #1773b0). */
export const CHECKOUT_ACCENT = "#1c1714";

/* ------------------------------------------------------------------------- *
 * BRAND + PRODUCT CONTENT (beauty-brand sections, REFY / GrandeBROW style)
 *
 * Every section below is hidden on the live site until you fill it in, so
 * nothing made-up is ever shown to customers. In `npm run dev` an empty
 * section shows a dashed hint box telling you what to write.
 *
 * Only write what is TRUE for your product: no "regrows in 30 days", no
 * invented percentages or awards. Real before/after photos go in the
 * product's images in admin.
 * ------------------------------------------------------------------------- */

export type ProductContent = {
  /** One short line under the name on product cards, e.g. "Хөмсөгний сэрум · 5 мл" */
  tagline?: string;
  /** Short tags under the title on the product page, e.g. ["Веган", "Үнэргүй"] */
  benefits?: string[];
  /** Numbered "how to use" steps */
  howTo?: string[];
  /** Highlighted ingredients, each with what it does */
  keyIngredients?: { name: string; text: string }[];
  /** Full INCI list, exactly as printed on the box */
  fullIngredients?: string;
  /** Product questions and answers */
  faq?: { q: string; a: string }[];
};

/** Keyed by product id (from admin). "default" applies to every product without its own entry. */
export const PRODUCT_CONTENT: Record<string, ProductContent> = {
  default: {},
};

export const productContent = (id?: string): ProductContent => ({
  ...PRODUCT_CONTENT.default,
  ...(id ? PRODUCT_CONTENT[id] : undefined),
});

export type BrandCopy = {
  /** Home hero headline + one line under it. */
  heroTitle: string;
  heroText: string;
  /** Brand values strip on the home page. Max 4. */
  values: { title: string; text: string }[];
  /** About page paragraphs, one per item (the first is shown large). */
  about: string[];
  /** Extra FAQ items for policies only you can state (delivery days, returns...).
   *  Delivery fee, payment methods, order tracking and the 15-min QPay window
   *  are answered automatically from how the site actually works. */
  faq: { q: string; a: string }[];
};

const fee = `${DELIVERY_FEE.toLocaleString()}₮`;

/**
 * PLACEHOLDER COPY (written 2026-10-10 so the site has no empty sections
 * while it's new). Replace with the real story when you have it: it contains
 * no founding year, people, certifications or product results on purpose.
 * Policies in `faq` (delivery days, returns) are defaults: change them to
 * what you will actually honour.
 */
export const BRAND_COPY: Record<"mn" | "en", BrandCopy> = {
  mn: {
    heroTitle: "Хөмсгийн арчилгаа, энгийнээр",
    heroText: "Хөмсгөө арчлах, хэлбэржүүлэх, тодруулах бүтээгдэхүүнүүд. Улаанбаатар болон орон нутагт хүргэнэ.",
    values: [
      { title: "Ил тод үнэ", text: "Хуурамч хямдралгүй. Харагдаж буй үнэ бол таны төлөх үнэ." },
      { title: "Хурдан хүргэлт", text: `Улаанбаатар болон орон нутагт ${fee}-өөр хүргэнэ.` },
      { title: "Хялбар төлбөр", text: "Банкныхаа аппаар QPay-р эсвэл дансны шилжүүлгээр төлнө." },
      { title: "Шууд дэмжлэг", text: "Захиалга, бүтээгдэхүүний талаар асуух зүйл байвал бидэнтэй шууд холбогдоорой." },
    ],
    about: [
      "Lorentz бол хөмсгөө арчлах, хэлбэржүүлэх хүмүүст зориулсан шинэхэн дэлгүүр.",
      "Бид жижгээс эхэлсэн: сайтар сонгосон цөөн бүтээгдэхүүн, ойлгомжтой үнэ, хурдан хүргэлт. Хөмсгийн арчилгаа төвөгтэй байх албагүй гэдэгт итгэдэг.",
      "Бүтээгдэхүүн бүр дээр хэрхэн хэрэглэхийг энгийнээр бичсэн. Асуух зүйл гарвал бидэнтэй шууд холбогдоорой.",
      "Lorentz-ийг сонгосонд баярлалаа.",
    ],
    faq: [
      {
        q: "Хүргэлт хэдэн хоногт хүрэх вэ?",
        a: "Захиалга баталгаажсанаас хойш Улаанбаатарт 1–2 ажлын өдөр, орон нутагт 2–5 ажлын өдөрт хүрнэ.",
      },
      {
        q: "Бүтээгдэхүүнээ буцаах боломжтой юу?",
        a: "Эрүүл ахуйн үүднээс нээсэн бүтээгдэхүүнийг буцаахгүй. Гэмтэлтэй эсвэл буруу бүтээгдэхүүн ирсэн бол хүлээн авснаас хойш 24 цагийн дотор бидэнтэй холбогдоно уу, солиж өгнө.",
      },
      {
        q: "Шинэ бүтээгдэхүүнийг хэрхэн туршиж үзэх вэ?",
        a: "Анх удаа хэрэглэхдээ жижиг хэсэгт түрхэж туршаарай. Улайх, загатнах шинж илэрвэл хэрэглэхээ зогсоож, эмчид хандана уу.",
      },
    ],
  },
  en: {
    heroTitle: "Brow care, made simple",
    heroText: "Products to care for, shape and define your brows. Delivered across Ulaanbaatar and the countryside.",
    values: [
      { title: "Honest pricing", text: "No fake discounts. The price you see is the price you pay." },
      { title: "Fast delivery", text: `Delivered across Ulaanbaatar and the countryside for ${fee}.` },
      { title: "Easy payment", text: "Pay with QPay from your bank app, or by bank transfer." },
      { title: "Real support", text: "Questions about an order or a product? Message us directly." },
    ],
    about: [
      "Lorentz is a new store for people who care for and shape their brows.",
      "We started small: a few carefully chosen products, clear prices and fast delivery. We believe brow care doesn't have to be complicated.",
      "Every product page explains how to use it in plain words. If you have a question, just reach out.",
      "Thank you for choosing Lorentz.",
    ],
    faq: [
      {
        q: "How long does delivery take?",
        a: "1–2 working days in Ulaanbaatar and 2–5 working days in the countryside, counted from order confirmation.",
      },
      {
        q: "Can I return a product?",
        a: "For hygiene reasons opened products can't be returned. If something arrives damaged or wrong, contact us within 24 hours of receiving it and we'll replace it.",
      },
      {
        q: "How should I try a new product?",
        a: "Test it on a small area first. If you notice redness or itching, stop using it and see a doctor.",
      },
    ],
  },
};

export const brandFor = (locale: string): BrandCopy => BRAND_COPY[locale === "en" ? "en" : "mn"];
