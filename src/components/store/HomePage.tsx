/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ArrowUpRight, CreditCard, PackageSearch, Truck } from "lucide-react";
import { STORE, brandFor } from "@/config/store";
import { DELIVERY_FEE } from "@/data/mongoliaLocations";
import { API_BASE_URL } from "@/lib/api";
import { useFood } from "@/hooks/useFood";
import { useCategoryTree } from "@/hooks/useCategoryTree";
import { ProductCard, ProductCardSkeleton } from "./ProductCard";
import { Reveal } from "./Reveal";
import { collectionUrl, money, productImages, productUrl } from "./lib/product";
import { useStoreT } from "./lib/useStoreT";
import { DevHint, Price, Stars } from "./ui";

// Literal class names so Tailwind generates them
const VALUE_COLS: Record<number, string> = { 1: "", 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-4" };

type LatestReview = { id: string; rating: number; comment: string; verifiedPurchase: boolean; name: string | null; product: { id: string; name: string; image: string } | null };

export function HomePage() {
  const { st, locale } = useStoreT();
  const BRAND = brandFor(locale);
  const { data: products = [], isLoading } = useFood();
  const { data: tree = [] } = useCategoryTree();
  const [reviews, setReviews] = useState<LatestReview[]>([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/review/latest?limit=6`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => Array.isArray(d) && setReviews(d))
      .catch(() => {});
  }, []);

  const time = (p: any) => new Date(p.createdAt).getTime() || 0;
  // Best sellers: real sales first, then featured, then newest
  const bestSellers = useMemo(
    () =>
      [...products]
        .sort(
          (a: any, b: any) =>
            Number(b.salesCount ?? 0) - Number(a.salesCount ?? 0) ||
            Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured)) ||
            time(b) - time(a),
        )
        .slice(0, 8),
    [products],
  );
  const hero = bestSellers[0];
  const spotlight = bestSellers[1] ?? bestSellers[0];

  // Category tiles use the first product photo in each category (real data)
  const tiles = useMemo(
    () =>
      tree
        .map((c: any) => ({ ...c, cover: products.find((p: any) => p.categoryId === c.id) }))
        .filter((c: any) => c.cover)
        .slice(0, 3),
    [tree, products],
  );

  const ticker = [...(STORE.announcements[locale] ?? STORE.announcements.mn ?? [])];

  return (
    <>
      {/* 1 · Editorial split hero */}
      <section className="page-width grid items-center gap-[36px] pb-[56px] pt-[28px] md:grid-cols-12 md:gap-[24px] md:py-[44px]">
        <div className="order-2 md:order-1 md:col-span-5">
          <Reveal>
            <span className="eyebrow">{STORE.name}</span>
          </Reveal>
          <Reveal delay={120}>
            <h1 className="store-heading mt-[18px] text-[54px] leading-[0.95] md:text-[96px]">{BRAND.heroTitle || STORE.name}</h1>
          </Reveal>
          <Reveal delay={240}>
            <p className="mt-[22px] max-w-[420px] text-[16px] leading-relaxed text-ink/70">{BRAND.heroText || st("hero_text")}</p>
          </Reveal>
          <Reveal delay={360} className="mt-[34px] flex flex-wrap items-center gap-x-[28px] gap-y-[16px]">
            <Link href={collectionUrl(locale)} className="btn group">
              {st("shop_all")}
              <span className="btn-arrow">
                <ArrowRight className="h-[16px] w-[16px]" strokeWidth={1.3} />
              </span>
            </Link>
            {hero && (
              <Link href={productUrl(locale, hero.id)} className="group inline-flex items-center gap-[6px] text-[14px] text-ink">
                <span className="link-underline">{hero.foodName}</span>
                <ArrowUpRight className="h-[15px] w-[15px] transition-transform duration-500 ease-silk group-hover:-translate-y-[2px] group-hover:translate-x-[2px]" strokeWidth={1.3} />
              </Link>
            )}
          </Reveal>
          {!BRAND.heroTitle && (
            <div className="mt-[24px]">
              <DevHint>BRAND_COPY.heroTitle / heroText in src/config/store.ts: your one-line promise (only what is true).</DevHint>
            </div>
          )}
        </div>

        <div className="relative order-1 md:order-2 md:col-span-6 md:col-start-7">
          <Reveal>
            <div className="relative aspect-square overflow-hidden bg-sand md:aspect-auto md:h-[min(calc(100dvh-210px),760px)] md:min-h-[520px]">
              {hero ? (
                <img src={productImages(hero)[0]} alt={hero.foodName} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full animate-pulse bg-sand" />
              )}
            </div>
          </Reveal>
          {/* Z-axis cascade: second photo overlaps the first (desktop only) */}
          {hero && productImages(hero)[1] && (
            <Reveal delay={300} className="absolute -left-[64px] bottom-[64px] hidden w-[34%] md:block">
              <div className="aspect-[4/5] overflow-hidden bg-sand shadow-[0_40px_80px_-30px_rgba(28,23,20,0.45)] ring-[6px] ring-paper">
                <img src={productImages(hero)[1]} alt="" className="h-full w-full object-cover" />
              </div>
            </Reveal>
          )}
          {hero && (
            <Reveal delay={450} className="absolute bottom-[16px] right-[16px] md:-right-[20px] md:bottom-[28px]">
              <Link
                href={productUrl(locale, hero.id)}
                className="group flex items-center gap-[14px] bg-paper/95 px-[16px] py-[12px] shadow-[0_24px_50px_-20px_rgba(28,23,20,0.4)] backdrop-blur-sm"
              >
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-taupe">{st("best_sellers")}</p>
                  <p className="store-heading mt-[2px] text-[19px]">{hero.foodName}</p>
                </div>
                <Price product={hero} className="flex-col !items-end !gap-0 text-[13px]" />
              </Link>
            </Reveal>
          )}
        </div>
      </section>

      {/* 2 · Ticker */}
      {ticker.length > 0 && (
        <div className="overflow-hidden bg-espresso py-[16px] text-paper">
          <div className="marquee flex w-max">
            {[0, 1].map((dup) => (
              <div key={dup} className="flex shrink-0 items-center" aria-hidden={dup === 1}>
                {Array.from({ length: 4 }).flatMap((_, r) =>
                  ticker.map((t, i) => (
                    <span key={`${r}-${i}`} className="flex items-center whitespace-nowrap">
                      <span className="display-italic px-[28px] text-[22px] md:text-[26px]">{t}</span>
                      <span className="text-[12px] text-paper/40">✦</span>
                    </span>
                  )),
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3 · Best sellers */}
      <section className="page-width py-[72px] md:py-[120px]">
        <div className="flex flex-wrap items-end justify-between gap-[20px]">
          <Reveal>
            <span className="eyebrow">{STORE.name}</span>
            <h2 className="store-heading mt-[12px] text-[44px] md:text-[64px]">{st("best_sellers")}</h2>
          </Reveal>
          <Reveal delay={150}>
            <Link href={collectionUrl(locale)} className="group inline-flex items-center gap-[8px] text-[14px] text-ink">
              <span className="link-underline">{st("view_all")}</span>
              <ArrowRight className="h-[15px] w-[15px] transition-transform duration-500 ease-silk group-hover:translate-x-[3px]" strokeWidth={1.3} />
            </Link>
          </Reveal>
        </div>
        <div className="mt-[40px] grid grid-cols-2 gap-x-[12px] gap-y-[44px] md:mt-[56px] md:grid-cols-4 md:gap-x-[24px] md:gap-y-[64px]">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : bestSellers.map((p: any, i: number) => (
                <Reveal key={p.id} delay={(i % 4) * 90}>
                  <ProductCard product={p} />
                </Reveal>
              ))}
        </div>
      </section>

      {/* 4 · Category bento */}
      {tiles.length >= 2 && (
        <section className="page-width pb-[72px] md:pb-[120px]">
          <Reveal>
            <h2 className="store-heading text-[44px] md:text-[64px]">{st("shop_by_category")}</h2>
          </Reveal>
          <div className="mt-[32px] grid gap-[12px] md:mt-[48px] md:grid-cols-12 md:grid-rows-2 md:gap-[20px]">
            {tiles.map((c: any, i: number) => (
              <Reveal
                key={c.id}
                delay={i * 120}
                className={i === 0 ? "md:col-span-7 md:row-span-2" : tiles.length === 2 ? "md:col-span-5 md:row-span-2" : "md:col-span-5"}
              >
                <Link href={collectionUrl(locale, c.id)} className="group relative block h-full min-h-[260px] overflow-hidden bg-sand md:min-h-[300px]">
                  <img
                    src={productImages(c.cover)[0]}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1400ms] ease-silk group-hover:scale-[1.05]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-espresso/70 via-espresso/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-[22px] text-paper md:p-[30px]">
                    <h3 className={`store-heading !text-paper ${i === 0 ? "text-[40px] md:text-[56px]" : "text-[32px] md:text-[38px]"}`}>{c.categoryName}</h3>
                    <span className="flex h-[44px] w-[44px] items-center justify-center bg-paper/15 backdrop-blur-sm transition-transform duration-500 ease-silk group-hover:-translate-y-[3px] group-hover:translate-x-[3px]">
                      <ArrowUpRight className="h-[18px] w-[18px]" strokeWidth={1.2} />
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* 5 · Spotlight (dark contrast section) */}
      {spotlight && (
        <section className="bg-espresso text-paper">
          <div className="page-width grid items-center gap-[40px] py-[72px] md:grid-cols-12 md:gap-[24px] md:py-[120px]">
            <Reveal className="md:col-span-6">
              <Link href={productUrl(locale, spotlight.id)} className="group block aspect-[4/5] overflow-hidden bg-ink">
                <img
                  src={productImages(spotlight)[0]}
                  alt={spotlight.foodName}
                  className="h-full w-full object-cover transition-transform duration-[1400ms] ease-silk group-hover:scale-[1.04]"
                />
              </Link>
            </Reveal>
            <div className="md:col-span-5 md:col-start-8">
              <Reveal>
                <span className="eyebrow !text-paper/50">{STORE.name}</span>
              </Reveal>
              <Reveal delay={120}>
                <h2 className="store-heading mt-[16px] text-[48px] !text-paper md:text-[72px]">{spotlight.foodName}</h2>
              </Reveal>
              <Reveal delay={200}>
                <Stars avg={Number(spotlight.avgRating ?? 0)} count={Number(spotlight.reviewCount ?? 0)} className="mt-[14px] [&_*]:!text-paper" />
                {spotlight.ingredients && (
                  <p className="mt-[20px] max-w-[440px] whitespace-pre-line text-[16px] leading-relaxed text-paper/70 line-clamp-6">{spotlight.ingredients}</p>
                )}
              </Reveal>
              <Reveal delay={300} className="mt-[32px] flex items-center gap-[24px]">
                <Link href={productUrl(locale, spotlight.id)} className="btn group !bg-paper !text-ink hover:!bg-sand">
                  {st("learn_more")}
                  <span className="btn-arrow !bg-ink/5">
                    <ArrowRight className="h-[16px] w-[16px]" strokeWidth={1.3} />
                  </span>
                </Link>
                <Price product={spotlight} className="text-[18px] [&_span]:!text-paper [&_s]:!text-paper/40" />
              </Reveal>
            </div>
          </div>
        </section>
      )}

      {/* 6 · Brand values */}
      {BRAND.values.length > 0 ? (
        <section className="page-width py-[72px] md:py-[120px]">
          <Reveal>
            <h2 className="store-heading text-[44px] md:text-[64px]">{st("our_values")}</h2>
          </Reveal>
          <ul className={`mt-[40px] grid gap-[32px] md:mt-[56px] md:gap-[24px] ${VALUE_COLS[Math.min(BRAND.values.length, 4)]}`}>
            {BRAND.values.slice(0, 4).map((v, i) => (
              <Reveal as="li" key={v.title} delay={i * 110} className="border-t border-ink/15 pt-[20px]">
                <span className="display-italic text-[40px] leading-none text-ink/30">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="store-heading mt-[14px] text-[26px]">{v.title}</h3>
                <p className="mt-[8px] text-[15px] text-ink/70">{v.text}</p>
              </Reveal>
            ))}
          </ul>
        </section>
      ) : (
        <div className="page-width pt-[48px]">
          <DevHint>BRAND_COPY.values in src/config/store.ts: up to 4 short brand promises (e.g. «Веган», «Амьтанд туршаагүй»). Only true ones.</DevHint>
        </div>
      )}

      {/* 7 · Real customer reviews: one big quote + the rest */}
      {reviews.length > 0 && (
        <section className="bg-sand">
          <div className="page-width py-[72px] md:py-[120px]">
            <Reveal className="mx-auto max-w-[920px] text-center">
              <span className="eyebrow">{st("customers_say")}</span>
              <Stars avg={reviews[0].rating} count={1} size={16} hideCount className="mt-[18px] justify-center" />
              <blockquote className="store-heading mt-[20px] text-[32px] leading-[1.2] md:text-[48px]">“{reviews[0].comment}”</blockquote>
              <p className="mt-[20px] text-[14px] text-ink/70">
                {reviews[0].name}
                {reviews[0].verifiedPurchase && <span> · {st("verified")}</span>}
                {reviews[0].product && (
                  <>
                    {" · "}
                    <Link href={productUrl(locale, reviews[0].product.id)} className="link-underline text-ink">
                      {reviews[0].product.name}
                    </Link>
                  </>
                )}
              </p>
            </Reveal>
            {reviews.length > 1 && (
              <ul className="mt-[56px] grid gap-[24px] md:grid-cols-3">
                {reviews.slice(1, 4).map((r, i) => (
                  <Reveal as="li" key={r.id} delay={i * 110} className="border-t border-ink/15 pt-[20px]">
                    <Stars avg={r.rating} count={1} size={12} hideCount />
                    <p className="mt-[10px] text-[15px] leading-relaxed text-ink line-clamp-4">“{r.comment}”</p>
                    <p className="mt-[10px] text-[13px] text-taupe">{r.name}</p>
                  </Reveal>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* 8 · Facts */}
      <section className="border-t border-ink/10">
        <ul className="page-width grid md:grid-cols-3 md:divide-x md:divide-ink/10">
          {[
            { icon: Truck, title: st("delivery_title"), text: st("delivery_text", { fee: money(DELIVERY_FEE) }) },
            { icon: CreditCard, title: st("payment_title"), text: st("payment_text") },
            { icon: PackageSearch, title: st("tracking_title"), text: st("tracking_text") },
          ].map(({ icon: Icon, title, text }, i) => (
            <Reveal as="li" key={title} delay={i * 100} className="flex items-start gap-[16px] border-b border-ink/10 py-[28px] md:border-b-0 md:px-[28px] md:py-[44px] md:first:pl-0">
              <Icon className="mt-[4px] h-[24px] w-[24px] shrink-0 text-ink" strokeWidth={1} />
              <div>
                <h3 className="store-heading text-[22px]">{title}</h3>
                <p className="mt-[4px] text-[14px] text-ink/65">{text}</p>
              </div>
            </Reveal>
          ))}
        </ul>
      </section>
    </>
  );
}
