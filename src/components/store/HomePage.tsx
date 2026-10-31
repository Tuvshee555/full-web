/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ArrowRight, ArrowUpRight, CreditCard, PackageSearch, Truck } from "lucide-react";
import { brandFor } from "@/config/store";
import { DELIVERY_FEE } from "@/data/mongoliaLocations";
import { API_BASE_URL } from "@/lib/api";
import { useProducts } from "@/hooks/useProducts";
import { useCategoryTree, type CategoryNode } from "@/hooks/useCategoryTree";
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

const PLACEHOLDER = "/product-image-coming-soon.svg";

/** Best sellers first, then featured, then newest: the same order the server uses for the hero photo. */
const rank = (products: any[]) =>
  [...products].sort(
    (a, b) =>
      Number(b.salesCount ?? 0) - Number(a.salesCount ?? 0) ||
      Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured)) ||
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

/** The first photo of these products that the page has not shown yet (repeats only when nothing else is left). */
function freshPhoto(products: any[], used: Set<string>) {
  const photos = products.flatMap((p) => productImages(p).filter((src) => src !== PLACEHOLDER));
  const photo = photos.find((src) => !used.has(src)) ?? photos[0] ?? null;
  if (photo) used.add(photo);
  return photo;
}

const inCategory = (product: any, category: CategoryNode): boolean =>
  product.categoryId === category.id || (category.children ?? []).some((child) => inCategory(product, child));

export function HomePage({ initialHero }: { initialHero?: { image: string; name: string } | null }) {
  const { st, locale } = useStoreT();
  const brand = brandFor(locale);
  const { data: products = [], isLoading, isError, refetch } = useProducts();
  const { data: categories = [] } = useCategoryTree();
  const [reviews, setReviews] = useState<LatestReview[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE_URL}/review/latest?limit=4`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setReviews(data);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const { hero, featured, tiles, storyPhoto } = useMemo(() => {
    const ranked = rank(products);
    const top = ranked[0];
    // The hero already shows the best seller; the grid shows the next four when there are enough.
    const grid = ranked.length > 4 ? ranked.slice(1, 5) : ranked.slice(0, 4);
    const used = new Set<string>([top, ...grid].filter(Boolean).map((p) => productImages(p)[0]));
    const categoryTiles = categories
      .map((category) => {
        const items = ranked.filter((p) => inCategory(p, category));
        return { id: category.id, name: category.categoryName, count: items.length, photo: freshPhoto(items, used) };
      })
      .filter((tile) => tile.count > 0);
    const story = freshPhoto(ranked, used);
    return { hero: top, featured: grid, tiles: categoryTiles, storyPhoto: story };
  }, [products, categories]);

  const heroPhoto = hero ? productImages(hero)[0] : initialHero?.image;
  const heroName = hero?.productName ?? initialHero?.name ?? "";
  const facts = [
    { icon: Truck, title: st("trust_delivery", { fee: money(DELIVERY_FEE) }), text: st("delivery_where") },
    { icon: CreditCard, title: st("payment_title"), text: st("payment_text") },
    { icon: PackageSearch, title: st("tracking_title"), text: st("tracking_text") },
  ];
  const faqs = [
    { q: st("faq_fee_q"), a: st("faq_fee_a", { fee: money(DELIVERY_FEE) }) },
    { q: st("faq_pay_q"), a: st("faq_pay_a") },
    { q: st("faq_track_q"), a: st("faq_track_a") },
  ];
  const viewAll = (
    <Link href={collectionUrl(locale)} className="inline-flex min-h-11 items-center gap-3 text-sm text-ink link-underline">
      {st("view_all")}
      <ArrowRight aria-hidden size={17} strokeWidth={1.3} />
    </Link>
  );

  return (
    <>
      {/* Phones: the photo comes first, so a product is on screen before any text. */}
      <section className="page-width md:pt-8 lg:pt-10">
        <div className="grid md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-10 lg:gap-16 xl:gap-20">
          <div className="product-media -mx-[20px] aspect-[4/3] sm:-mx-[32px] sm:aspect-[16/10] md:order-2 md:mx-0 md:aspect-auto md:h-[min(calc(100svh-200px),680px)] md:min-h-[480px]">
            {!heroPhoto && isLoading ? (
              <div className="absolute inset-0 animate-pulse bg-sand" />
            ) : (
              <ProductImage
                src={heroPhoto ? imageUrl(heroPhoto, HERO_IMAGE.width) : undefined}
                srcSet={heroPhoto ? imageSrcSet(heroPhoto, [...HERO_IMAGE.widths]) : undefined}
                sizes={HERO_IMAGE.sizes}
                alt={heroName}
                fetchPriority="high"
                className="absolute inset-0"
              />
            )}
            {hero && (
              <Link
                href={productUrl(locale, hero.id)}
                className="group absolute bottom-[12px] left-[12px] flex max-w-[calc(100%-24px)] items-center gap-[14px] bg-paper py-[10px] pl-[14px] pr-[12px] sm:bottom-[20px] sm:left-[20px]"
              >
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium leading-snug text-ink">{hero.productName}</p>
                  <Price product={hero} className="text-[13px]" />
                </div>
                <ArrowUpRight aria-hidden className="h-[18px] w-[18px] shrink-0 text-ink transition-transform duration-300 ease-silk group-hover:-translate-y-0.5 group-hover:translate-x-0.5" strokeWidth={1.3} />
              </Link>
            )}
          </div>
          <div className="flex min-w-0 flex-col justify-center pb-2 pt-7 md:order-1 md:py-10">
            <h1 className="store-heading max-w-xl text-[clamp(40px,5.4vw,84px)]">{brand.heroTitle}</h1>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-taupe sm:text-base md:mt-6">{brand.heroText}</p>
            <div className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-3 md:mt-9">
              <Link href={collectionUrl(locale)} className="btn group">
                {st("shop_all")}
                <ArrowRight aria-hidden size={17} strokeWidth={1.4} className="transition-transform duration-300 ease-silk group-hover:translate-x-0.5" />
              </Link>
              <Link href={`/${locale}/about`} className="inline-flex min-h-11 items-center text-sm text-ink link-underline">
                {st("about")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* What every shopper asks first, straight under the hero rather than at the bottom of the page. */}
      <div className="page-width mt-8 md:mt-10">
        <ul className="grid divide-y divide-line border-y border-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {facts.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-start gap-[14px] py-[16px] sm:px-[20px] sm:py-[20px] sm:first:pl-0">
              <Icon aria-hidden className="mt-[2px] h-[20px] w-[20px] shrink-0 text-bronze" strokeWidth={1.3} />
              <div className="min-w-0">
                <p className="text-[14px] font-medium leading-snug text-ink">{title}</p>
                <p className="mt-[2px] text-[13px] leading-relaxed text-taupe">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <section aria-labelledby="home-featured" className="page-width pt-12 lg:pt-20">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <h2 id="home-featured" className="store-heading section-title">{st("featured_products")}</h2>
          {viewAll}
        </div>
        {isError ? (
          <CatalogState error onAction={() => void refetch()} />
        ) : !isLoading && !featured.length ? (
          <CatalogState />
        ) : (
          <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-6 lg:mt-9 lg:grid-cols-4">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : featured.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>

      {tiles.length > 1 && (
        <section aria-labelledby="home-categories" className="page-width pt-14 lg:pt-20">
          <h2 id="home-categories" className="store-heading section-title">{st("shop_by_category")}</h2>
          {/* A swipeable row on phones and tablets, one even row on a computer. */}
          <ul
            className="-mx-[20px] mt-7 flex snap-x snap-mandatory scroll-px-[20px] gap-[12px] overflow-x-auto px-[20px] pb-[4px] [scrollbar-width:none] sm:-mx-[32px] sm:scroll-px-[32px] sm:px-[32px]
              lg:mx-0 lg:mt-9 lg:grid lg:gap-[20px] lg:overflow-visible lg:px-0 lg:pb-0 lg:[grid-template-columns:repeat(var(--cols),minmax(0,1fr))]"
            style={{ "--cols": Math.min(tiles.length, 5) } as CSSProperties}
          >
            {tiles.map((tile) => (
              <li key={tile.id} className="w-[42%] shrink-0 snap-start sm:w-[28%] lg:w-auto">
                <Link href={collectionUrl(locale, tile.id)} className="group block">
                  <div className="product-media aspect-[4/5]">
                    <ProductImage
                      src={tile.photo ? imageUrl(tile.photo, 480) : undefined}
                      srcSet={tile.photo ? imageSrcSet(tile.photo, [320, 480, 640]) : undefined}
                      sizes="(min-width: 1024px) 20vw, (min-width: 640px) 28vw, 42vw"
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 transition-transform duration-700 ease-silk group-hover:scale-[1.03]"
                    />
                  </div>
                  <p className="mt-[12px] text-[15px] font-medium leading-snug text-ink group-hover:underline group-hover:underline-offset-4">{tile.name}</p>
                  <p className="mt-[2px] text-[13px] text-taupe">
                    {tile.count === 1 ? st("product_count_one") : st("products_count", { n: tile.count })}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-14 border-y border-line bg-sand/40 lg:mt-20">
        <div className="page-width grid items-center gap-8 py-10 md:grid-cols-2 md:gap-16 lg:py-16">
          {storyPhoto && (
            <div className="product-media aspect-[5/4]">
              <ProductImage
                src={imageUrl(storyPhoto, 800)}
                srcSet={imageSrcSet(storyPhoto, [480, 800, 1200])}
                sizes="(min-width: 768px) 50vw, 100vw"
                alt=""
                loading="lazy"
                className="absolute inset-0"
              />
            </div>
          )}
          <div className={storyPhoto ? "max-w-lg" : "max-w-2xl md:col-span-2"}>
            <h2 className="store-heading section-title">{st("story_title")}</h2>
            <p className="mt-5 text-base leading-relaxed text-taupe">{st("story_body")}</p>
            <Link href={`/${locale}/about`} className="mt-5 inline-flex min-h-11 items-center gap-3 text-sm text-ink link-underline">
              {st("about")}
              <ArrowRight aria-hidden size={16} />
            </Link>
          </div>
        </div>
      </section>

      {reviews.length > 0 && (
        <section aria-labelledby="home-reviews" className="page-width py-12 lg:py-16">
          <h2 id="home-reviews" className="store-heading section-title">{st("customers_say")}</h2>
          <div className="mt-8 grid gap-10 md:grid-cols-2 md:gap-14">
            {reviews.slice(0, 2).map((review) => (
              <figure key={review.id} className="border-t border-line pt-6">
                <Stars avg={review.rating} count={1} hideCount />
                <blockquote className="store-heading mt-4 line-clamp-5 text-[26px] sm:text-3xl">“{review.comment}”</blockquote>
                <figcaption className="mt-4 text-sm text-taupe">
                  {[review.name, review.verifiedPurchase && st("verified")].filter(Boolean).join(" · ")}
                  {review.product && (
                    <Link href={productUrl(locale, review.product.id)} className="mt-1 block w-fit text-ink link-underline">
                      {review.product.name}
                    </Link>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="home-faq" className={`page-width grid gap-8 pb-14 md:grid-cols-[1fr_1.2fr] md:gap-16 lg:pb-20 ${reviews.length ? "pt-2" : "pt-12 lg:pt-16"}`}>
        <div>
          <h2 id="home-faq" className="store-heading section-title">{st("faq_title")}</h2>
          <p className="mt-4 max-w-sm text-sm text-taupe">{st("contact_sub")}</p>
          <div className="mt-3 flex flex-wrap gap-x-6">
            <Link href={`/${locale}/faq`} className="inline-flex min-h-11 items-center gap-3 text-sm text-ink link-underline">
              {st("all_questions")}
              <ArrowRight aria-hidden size={16} />
            </Link>
            <Link href={`/${locale}/contact`} className="inline-flex min-h-11 items-center gap-3 text-sm text-ink link-underline">
              {st("contact")}
              <ArrowRight aria-hidden size={16} />
            </Link>
          </div>
        </div>
        <div className="border-t border-line">
          {faqs.map((faq) => (
            <details key={faq.q} className="group border-b border-line">
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-5 py-4 text-base font-medium text-ink [&::-webkit-details-marker]:hidden">
                {faq.q}
                <span aria-hidden className="text-xl font-normal transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="pb-6 text-sm leading-relaxed text-taupe">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
