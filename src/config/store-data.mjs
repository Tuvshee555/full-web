// One place for the storefront's name and fixed copy. Change the brand here
// and the header, footer, checkout and product "vendor" line all follow.
import { storefrontDeliveryFee } from "../data/deliveryFee.mjs";
const DELIVERY_FEE = storefrontDeliveryFee();
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
    },
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
/** Keyed by product id (from admin). "default" applies to every product without its own entry. */
export const PRODUCT_CONTENT = {
    default: {},
};
export const productContent = (id) => ({
    ...PRODUCT_CONTENT.default,
    ...(id ? PRODUCT_CONTENT[id] : undefined),
});
const fee = `${DELIVERY_FEE.toLocaleString()}₮`;
/**
 * What the shop promises, in one place. The FAQ, the Terms page and the checkout all
 * read these, so they never disagree. Change them to what you will actually honour.
 */
export const POLICIES = {
    mn: {
        delivery: "Захиалга баталгаажсанаас хойш Улаанбаатарт 1–2 ажлын өдөр, орон нутагт 2–5 ажлын өдөрт хүрнэ.",
        returns: "Эрүүл ахуйн үүднээс нээсэн бүтээгдэхүүнийг буцаахгүй. Гэмтэлтэй эсвэл буруу бүтээгдэхүүн ирсэн бол хүлээн авснаас хойш 24 цагийн дотор бидэнтэй холбогдоно уу, солиж өгнө.",
        safety: "Анх удаа хэрэглэхдээ жижиг хэсэгт түрхэж туршаарай. Улайх, загатнах шинж илэрвэл хэрэглэхээ зогсоож, эмчид хандана уу.",
    },
    en: {
        delivery: "1–2 working days in Ulaanbaatar and 2–5 working days in the countryside, counted from order confirmation.",
        returns: "For hygiene reasons opened products can't be returned. If something arrives damaged or wrong, contact us within 24 hours of receiving it and we'll replace it.",
        safety: "Test it on a small area first. If you notice redness or itching, stop using it and see a doctor.",
    },
};
/** Date shown at the bottom of the Terms and Privacy pages. Update it when you change them. */
export const LEGAL_UPDATED = "2026-10-23";
/**
 * PLACEHOLDER COPY (written 2026-10-10 so the site has no empty sections
 * while it's new). Replace with the real story when you have it: it contains
 * no founding year, people, certifications or product results on purpose.
 * Policies in `faq` (delivery days, returns) are defaults: change them to
 * what you will actually honour.
 */
export const BRAND_COPY = {
    mn: {
        heroTitle: "Хөмсгийн арчилгаа, энгийнээр",
        heroText: "Хөмсгөө арчлах, хэлбэржүүлэх, тодруулах бүтээгдэхүүнүүд. Улаанбаатар болон орон нутагт хүргэнэ.",
        values: [
            { title: "Ил тод үнэ", text: "Хуурамч хямдралгүй. Харагдаж буй үнэ бол таны төлөх үнэ." },
            { title: "Хүргэлт", text: `Улаанбаатар болон орон нутагт ${fee}-өөр хүргэнэ.` },
            { title: "Хялбар төлбөр", text: "Банкныхаа аппаар QPay-р эсвэл дансны шилжүүлгээр төлнө." },
            { title: "Шууд дэмжлэг", text: "Захиалга, бүтээгдэхүүний талаар асуух зүйл байвал бидэнтэй шууд холбогдоорой." },
        ],
        about: [
            "Lorentz бол хөмсгийн арчилгаа, хэлбэржүүлэлтийн бүтээгдэхүүний дэлгүүр.",
            "Цуглуулгаас өөрт тохирох бүтээгдэхүүнээ сонгож, үнэ болон боломжит хувилбаруудтай нь танилцаарай. Улаанбаатар болон орон нутагт хүргэлттэй.",
            "Бүтээгдэхүүн, хэрэглэх заавар эсвэл захиалгын талаар асуух зүйл гарвал бидэнтэй шууд холбогдоорой.",
            "Lorentz-ийг сонгосонд баярлалаа.",
        ],
        faq: [
            {
                q: "Хүргэлт хэдэн хоногт хүрэх вэ?",
                a: POLICIES.mn.delivery,
            },
            {
                q: "Бүтээгдэхүүнээ буцаах боломжтой юу?",
                a: POLICIES.mn.returns,
            },
            {
                q: "Шинэ бүтээгдэхүүнийг хэрхэн туршиж үзэх вэ?",
                a: POLICIES.mn.safety,
            },
        ],
    },
    en: {
        heroTitle: "Brow care, made simple",
        heroText: "Products to care for, shape and define your brows. Delivered across Ulaanbaatar and the countryside.",
        values: [
            { title: "Honest pricing", text: "No fake discounts. The price you see is the price you pay." },
            { title: "Delivery", text: `Delivered across Ulaanbaatar and the countryside for ${fee}.` },
            { title: "Easy payment", text: "Pay with QPay from your bank app, or by bank transfer." },
            { title: "Real support", text: "Questions about an order or a product? Message us directly." },
        ],
        about: [
            "Lorentz is a store for brow care and shaping products.",
            "Explore the collection, compare prices and available options, and choose what suits your routine. We deliver across Ulaanbaatar and the countryside.",
            "For product information, usage instructions or help with an order, please contact us directly.",
            "Thank you for choosing Lorentz.",
        ],
        faq: [
            {
                q: "How long does delivery take?",
                a: POLICIES.en.delivery,
            },
            {
                q: "Can I return a product?",
                a: POLICIES.en.returns,
            },
            {
                q: "How should I try a new product?",
                a: POLICIES.en.safety,
            },
        ],
    },
};
export const brandFor = (locale) => BRAND_COPY[locale === "en" ? "en" : "mn"];
