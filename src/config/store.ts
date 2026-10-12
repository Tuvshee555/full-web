import * as data from "./store-data.mjs";

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

export const STORE: Omit<typeof data.STORE, "announcements"> & { announcements: Record<string, string[]> } = data.STORE;
export const CHECKOUT_ACCENT = data.CHECKOUT_ACCENT;
export const PRODUCT_CONTENT: Record<string, ProductContent> = data.PRODUCT_CONTENT;
export const BRAND_COPY: Record<"mn" | "en", BrandCopy> = data.BRAND_COPY;
export const productContent = (id?: string): ProductContent => ({ ...PRODUCT_CONTENT.default, ...(id ? PRODUCT_CONTENT[id] : undefined) });
export const brandFor = (locale: string): BrandCopy => BRAND_COPY[locale === "en" ? "en" : "mn"];
