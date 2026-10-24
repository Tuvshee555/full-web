"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CreditCard,
  PackageSearch,
  Truck,
} from "lucide-react";
import { brandFor } from "@/config/store";
import { DELIVERY_FEE } from "@/data/mongoliaLocations";
import { API_BASE_URL } from "@/lib/api";
import { useProducts } from "@/hooks/useProducts";
import { useCategoryTree } from "@/hooks/useCategoryTree";
import { ProductCard, ProductCardSkeleton } from "./ProductCard";
import { ProductImage } from "./ProductImage";
import { CatalogState } from "./CatalogState";
import { collectionUrl, money, productImages, productUrl } from "./lib/product";
import { useStoreT } from "./lib/useStoreT";
import { Price, Stars } from "./ui";
import { HERO_IMAGE, imageSrcSet, imageUrl } from "@/lib/image";

type LatestReview = {
  id: string;
  rating: number;
  comment: string;
  verifiedPurchase: boolean;
  name: string | null;
  product: { id: string; name: string; image: string } | null;
};

export function HomePage({
  initialHero,
}: {
  initialHero?: { image: string; name: string } | null;
}) {
  const { st, locale } = useStoreT();
  const brand = brandFor(locale);
  const { data: products = [], isLoading, isError, refetch } = useProducts();
  const { data: categories = [] } = useCategoryTree();
  const [reviews, setReviews] = useState<LatestReview[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE_URL}/review/latest?limit=4`, {
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setReviews(data);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const selected = useMemo(
    () =>
      [...products]
        .sort(
          (a, b) =>
            Number(b.salesCount ?? 0) - Number(a.salesCount ?? 0) ||
            Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured)) ||
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 4),
    [products],
  );
  const hero = selected[0];
  const heroPhoto = hero ? productImages(hero)[0] : initialHero?.image;
  const heroName = hero?.productName ?? initialHero?.name ?? "";
  const supporting = selected[1];
  const faqs = [
    { q: st("faq_fee_q"), a: st("faq_fee_a", { fee: money(DELIVERY_FEE) }) },
    { q: st("faq_pay_q"), a: st("faq_pay_a") },
    { q: st("faq_track_q"), a: st("faq_track_a") },
  ];

  return (
    <>
      <section className="page-width py-6 sm:py-10 lg:py-12">
        <div className="grid border border-line lg:grid-cols-2">
          <div className="flex min-w-0 flex-col justify-center bg-sand/35 px-6 py-10 sm:px-10 sm:py-14 lg:px-14 lg:py-16">
            <span className="eyebrow">{st("beauty_ritual")}</span>
            <h1 className="store-heading mt-5 max-w-xl text-[clamp(42px,5.2vw,76px)]">
              {brand.heroTitle}
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-taupe">
              {brand.heroText}
            </p>
            <div className="mt-8">
              <Link href={collectionUrl(locale)} className="btn">
                {st("shop_all")}
                <ArrowRight size={17} strokeWidth={1.4} />
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-5 text-xs text-taupe">
              <span>Lorentz · {st("brow_care")}</span>
              <Link
                href={`/${locale}/about`}
                className="inline-flex min-h-8 items-center gap-2 text-ink link-underline"
              >
                {st("our_story")}
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
          <div className="relative flex min-w-0 flex-col border-t border-line bg-sand/60 lg:border-l lg:border-t-0">
            <div className="product-media relative aspect-[5/4] flex-1 lg:aspect-[4/5] lg:max-h-[600px]">
              {!heroPhoto && isLoading ? (
                <div className="absolute inset-0 animate-pulse bg-sand" />
              ) : (
                <ProductImage
                  src={
                    heroPhoto
                      ? imageUrl(heroPhoto, HERO_IMAGE.width)
                      : undefined
                  }
                  srcSet={
                    heroPhoto
                      ? imageSrcSet(heroPhoto, [...HERO_IMAGE.widths])
                      : undefined
                  }
                  sizes={HERO_IMAGE.sizes}
                  alt={heroName}
                  fetchPriority="high"
                  className="absolute inset-0"
                />
              )}
              <span className="absolute left-5 top-5 text-xs text-bronze">
                {st("the_lorentz_edit")}
              </span>
            </div>
            {hero && (
              <Link
                href={productUrl(locale, hero.id)}
                className="group flex items-center justify-between gap-5 border-t border-line bg-paper p-5 sm:px-8"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">
                    {hero.productName}
                  </p>
                  <Price product={hero} className="mt-1 text-sm" />
                </div>
                <ArrowUpRight
                  className="h-5 w-5 shrink-0 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1"
                  strokeWidth={1.2}
                />
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="page-width py-8 lg:pb-16 lg:pt-10">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <span className="eyebrow">{st("the_lorentz_edit")}</span>
            <h2 className="store-heading section-title mt-2">
              {st("featured_products")}
            </h2>
          </div>
          <Link
            href={collectionUrl(locale)}
            className="inline-flex min-h-11 items-center gap-3 text-sm text-ink link-underline"
          >
            {st("view_all")}
            <ArrowRight size={17} strokeWidth={1.3} />
          </Link>
        </div>
        {isError ? (
          <CatalogState error onAction={() => void refetch()} />
        ) : !isLoading && !selected.length ? (
          <CatalogState />
        ) : (
          <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:mt-9 lg:grid-cols-4">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))
              : selected.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
        {categories.length > 0 && (
          <nav
            aria-label={st("shop_by_category")}
            className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-line pt-4"
          >
            <span className="mr-2 text-xs text-taupe">
              {st("shop_by_category")}
            </span>
            {categories.map((category) => (
              <Link
                key={category.id}
                href={collectionUrl(locale, category.id)}
                className="inline-flex min-h-11 items-center gap-2 text-sm text-ink link-underline"
              >
                {category.categoryName}
                <ArrowUpRight size={13} strokeWidth={1.3} />
              </Link>
            ))}
          </nav>
        )}
      </section>

      <section className="border-y border-line bg-sand/40">
        <div className="page-width grid items-center gap-8 py-10 md:grid-cols-2 md:gap-16 lg:py-16">
          {supporting && (
            <Link
              href={productUrl(locale, supporting.id)}
              className="product-media block aspect-[5/4] border border-line"
            >
              <ProductImage
                src={imageUrl(productImages(supporting)[0], 800)}
                srcSet={imageSrcSet(productImages(supporting)[0])}
                sizes="(min-width: 768px) 50vw, 100vw"
                alt={supporting.productName}
                loading="lazy"
              />
            </Link>
          )}
          <div className={supporting ? "max-w-lg" : "max-w-2xl md:col-span-2"}>
            <span className="eyebrow">{st("our_story")}</span>
            <h2 className="store-heading section-title mt-3">
              {st("story_title")}
            </h2>
            <p className="mt-5 text-base leading-relaxed text-taupe">
              {st("story_body")}
            </p>
            <Link
              href={`/${locale}/about`}
              className="mt-5 inline-flex min-h-11 items-center gap-3 text-sm text-ink link-underline"
            >
              {st("about")}
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {reviews.length > 0 && (
        <section className="page-width py-12 lg:py-16">
          <span className="eyebrow">{st("customers_say")}</span>
          <div className="mt-6 grid gap-8 md:grid-cols-2">
            {reviews.slice(0, 2).map((review) => (
              <figure key={review.id} className="border-t border-line pt-6">
                <Stars avg={review.rating} count={1} hideCount />
                <blockquote className="store-heading mt-4 text-3xl">
                  “{review.comment}”
                </blockquote>
                <figcaption className="mt-4 text-sm text-taupe">
                  {review.name}
                  {review.verifiedPurchase && ` · ${st("verified")}`}
                  {review.product && (
                    <Link
                      href={productUrl(locale, review.product.id)}
                      className="mt-1 block text-ink link-underline"
                    >
                      {review.product.name}
                    </Link>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      <section className="page-width grid gap-8 py-12 md:grid-cols-[1fr_1.2fr] md:gap-16 lg:py-16">
        <div>
          <span className="eyebrow">{st("here_to_help")}</span>
          <h2 className="store-heading section-title mt-3">
            {st("faq_title")}
          </h2>
          <p className="mt-4 max-w-sm text-sm text-taupe">
            {st("contact_sub")}
          </p>
          <Link
            href={`/${locale}/contact`}
            className="mt-4 inline-flex min-h-11 items-center gap-3 text-sm text-ink link-underline"
          >
            {st("contact")}
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="border-t border-line">
          {faqs.map((faq) => (
            <details key={faq.q} className="group border-b border-line">
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-5 py-4 text-base font-medium text-ink [&::-webkit-details-marker]:hidden">
                {faq.q}
                <span
                  aria-hidden
                  className="text-xl font-normal transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="pb-6 text-sm leading-relaxed text-taupe">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="border-t border-line">
        <ul className="page-width grid divide-y divide-line md:grid-cols-3 md:divide-x md:divide-y-0">
          {[
            {
              icon: Truck,
              title: st("delivery_title"),
              text: st("delivery_text", { fee: money(DELIVERY_FEE) }),
            },
            {
              icon: CreditCard,
              title: st("payment_title"),
              text: st("payment_text"),
            },
            {
              icon: PackageSearch,
              title: st("tracking_title"),
              text: st("tracking_text"),
            },
          ].map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-4 py-7 md:px-6 md:first:pl-0">
              <Icon
                className="mt-1 h-5 w-5 shrink-0 text-bronze"
                strokeWidth={1.3}
              />
              <div>
                <h3 className="text-sm font-medium text-ink">{title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-taupe">
                  {text}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
