// One place for the storefront's name and fixed copy. Change the brand here
// and the header, footer, checkout and product "vendor" line all follow.
import { DELIVERY_FEE } from "@/data/mongoliaLocations";

export const STORE = {
  name: "Nomad Edge",
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

export const BRAND = {
  /** Home hero. Empty = store name + generic line. */
  heroTitle: "",
  heroText: "",
  /** Brand values strip on the home page (REFY "Community First / Vegan / ..."). Max 4. */
  values: [] as { title: string; text: string }[],
};
