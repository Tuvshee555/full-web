// Titles, descriptions and share cards for every storefront page. When a product
// link is pasted into Messenger or Facebook, the preview shows that product's
// name, price and photo instead of a bare "Lorentz".
//
// Server-only: it reads the database directly (never at import time, so builds
// without a database still work) and every lookup is cached for a minute.
import type { Metadata } from "next";
import { siteUrl } from "../../server/utils/siteUrl.js";
import { cached } from "../../server/utils/cache.js";
import { STORE } from "@/config/store";

export type Locale = "mn" | "en";
export const localeOf = (value: unknown): Locale => (value === "en" ? "en" : "mn");

/** The storefront strings ("store.*" in src/messages) for server-side titles. */
export async function storeMessages(locale: Locale): Promise<Record<string, string>> {
  const all = locale === "en" ? (await import("@/messages/en.json")).default : (await import("@/messages/mn.json")).default;
  return (all as unknown as { store: Record<string, string> }).store;
}

/** Branded 1200x630 card used when a page has no photo of its own (public/og-default.png). */
const DEFAULT_OG_IMAGE = { url: "/og-default.png", width: 1200, height: 630 };

/** One line of plain text for meta descriptions: no line breaks, cut at a word boundary. */
export function describe(text: string | null | undefined, max = 160): string | undefined {
  const flat = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!flat) return undefined;
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 30))}…`;
}

type PageInput = {
  locale: Locale;
  /** Path after the locale, "" for the home page: "/about", "/products/<id>" */
  path: string;
  title?: string;
  /** Replaces the "<title> | Lorentz" template (home page) */
  absoluteTitle?: string;
  description?: string;
  /** Absolute URL of a photo for the share card */
  image?: string | null;
  /** Cart, checkout, account and payment pages stay out of search results */
  noindex?: boolean;
};

export function pageMetadata({ locale, path, title, absoluteTitle, description, image, noindex }: PageInput): Metadata {
  const url = `/${locale}${path}`;
  const shown = absoluteTitle ?? (title ? `${title} | ${STORE.name}` : STORE.name);
  const photo = image && /^https?:\/\//.test(image) ? [{ url: image, alt: title ?? STORE.name }] : [{ ...DEFAULT_OG_IMAGE, alt: STORE.name }];
  return {
    title: absoluteTitle ? { absolute: absoluteTitle } : title,
    ...(description ? { description } : {}),
    alternates: { canonical: url, languages: { mn: `/mn${path}`, en: `/en${path}`, "x-default": `/mn${path}` } },
    openGraph: {
      type: "website",
      siteName: STORE.name,
      locale: locale === "en" ? "en_US" : "mn_MN",
      url,
      title: shown,
      ...(description ? { description } : {}),
      images: photo,
    },
    twitter: { card: "summary_large_image", title: shown, ...(description ? { description } : {}), images: photo.map((p) => p.url) },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
  };
}

/** Next.js `generateMetadata` for a static page whose title is a storefront string. */
export function staticPageMetadata(path: string, titleKey: string, options: { noindex?: boolean; description?: (m: Record<string, string>, locale: Locale) => string | undefined } = {}) {
  return async ({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> => {
    const locale = localeOf((await params).locale);
    const messages = await storeMessages(locale);
    return pageMetadata({ locale, path, title: messages[titleKey], description: options.description?.(messages, locale), noindex: options.noindex });
  };
}

export type ProductMeta = {
  id: string;
  name: string;
  description?: string;
  image: string | null;
  images: string[];
  lowPrice: number;
  highPrice: number;
  priceCount: number;
  inStock: boolean;
  rating: number;
  reviewCount: number;
};

type SizeRow = { price: number | null; stock: number | null };

const money = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * What a share card and Google need to know about a product.
 * null = there is no such product; undefined = the lookup failed (a database hiccup
 * is never reported as "missing", and is not remembered).
 */
export async function loadProductMeta(id: string): Promise<ProductMeta | null | undefined> {
  if (!id || id.length > 100) return null;
  try {
    return await cached(`seo:product:${id}`, 60_000, async () => {
      const { prisma } = await import("../../server/prismaClient.js");
      const product = await prisma.product.findUnique({
        where: { id },
        select: {
          id: true, productName: true, price: true, image: true, extraImages: true, ingredients: true,
          avgRating: true, reviewCount: true,
          sizes: { select: { price: true, stock: true } },
        },
      });
      if (!product) return null;
      const base = money(product.price);
      const prices = product.sizes.length ? product.sizes.map((s: SizeRow) => money(s.price) || base) : [base];
      const images = [product.image, ...product.extraImages].filter((u): u is string => /^https?:\/\//.test(u ?? ""));
      return {
        id: product.id,
        name: product.productName,
        description: describe(product.ingredients),
        image: images[0] ?? null,
        images,
        lowPrice: Math.min(...prices),
        highPrice: Math.max(...prices),
        priceCount: product.sizes.length || 1,
        // Untracked stock (null) counts as available; only a tracked 0 is sold out.
        inStock: !product.sizes.length || product.sizes.some((s: SizeRow) => s.stock == null || s.stock > 0),
        rating: Number(product.avgRating) || 0,
        reviewCount: Number(product.reviewCount) || 0,
      };
    });
  } catch (error) {
    console.error("SEO product lookup failed:", (error as Error)?.message);
    return undefined;
  }
}

/** Category name for a /collections/<id> page, or null for an unknown id. */
export function loadCategoryName(id: string): Promise<string | null> {
  if (!id || id.length > 100) return Promise.resolve(null);
  return cached(`seo:category:${id}`, 60_000, async () => {
    try {
      const { prisma } = await import("../../server/prismaClient.js");
      const category = await prisma.category.findUnique({ where: { id }, select: { categoryName: true } });
      return category?.categoryName ?? null;
    } catch (error) {
      console.error("SEO category lookup failed:", (error as Error)?.message);
      return null;
    }
  });
}

/** JSON for a <script type="application/ld+json"> tag. "<" is escaped so shop or product text can never close the tag early. */
export const serializeJsonLd = (data: object) => JSON.stringify(data).replace(/</g, "\\u003c");

const absolute = (path: string) => `${siteUrl()}${path}`;

/** schema.org Product, so Google can show price and availability under the result. */
export function productJsonLd(product: ProductMeta, locale: Locale) {
  const availability = `https://schema.org/${product.inStock ? "InStock" : "OutOfStock"}`;
  const url = absolute(`/${locale}/products/${product.id}`);
  const offers = product.lowPrice === product.highPrice
    ? { "@type": "Offer", url, priceCurrency: "MNT", price: product.lowPrice, availability, itemCondition: "https://schema.org/NewCondition" }
    : { "@type": "AggregateOffer", url, priceCurrency: "MNT", lowPrice: product.lowPrice, highPrice: product.highPrice, offerCount: product.priceCount, availability };
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.id,
    url,
    ...(product.description ? { description: product.description } : {}),
    ...(product.images.length ? { image: product.images } : {}),
    brand: { "@type": "Brand", name: STORE.name },
    offers,
    // Only real reviews: nothing is invented when a product has none yet.
    ...(product.reviewCount > 0 && product.rating > 0
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: Number(product.rating.toFixed(1)), reviewCount: product.reviewCount } }
      : {}),
  };
}

/** schema.org Organization + WebSite for the home page. */
export function siteJsonLd(locale: Locale) {
  const phone = STORE.contact.phone?.replace(/\D/g, "");
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: STORE.name,
        url: absolute(`/${locale}`),
        ...(STORE.contact.email ? { email: STORE.contact.email } : {}),
        ...(phone?.length === 8 ? { telephone: `+976${phone}` } : {}),
        ...(STORE.social.facebook || STORE.social.instagram ? { sameAs: [STORE.social.facebook, STORE.social.instagram].filter(Boolean) } : {}),
      },
      { "@type": "WebSite", name: STORE.name, url: absolute(`/${locale}`), inLanguage: locale },
    ],
  };
}

/** The metadata base: every relative URL in a card resolves against the site's real address. */
export const metadataBase = () => new URL(siteUrl());
