/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CreditCard, PackageSearch, Truck } from "lucide-react";
import { BRAND, STORE } from "@/config/store";
import { DELIVERY_FEE } from "@/data/mongoliaLocations";
import { API_BASE_URL } from "@/lib/api";
import { useFood } from "@/hooks/useFood";
import { useCategoryTree } from "@/hooks/useCategoryTree";
import { ProductCard, ProductCardSkeleton } from "./ProductCard";
import { collectionUrl, money, productImages, productUrl } from "./lib/product";
import { useStoreT } from "./lib/useStoreT";
import { CREAM, DevHint, Price, Stars } from "./ui";

// Literal class names so Tailwind generates them
const VALUE_COLS: Record<number, string> = { 1: "", 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-4" };

type LatestReview ={ id: string; rating: number; comment: string; verifiedPurchase: boolean; name: string | null; product: { id: string; name: string; image: string } | null };

export function HomePage() {
  const { st, locale } = useStoreT();
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
  const spotlight = bestSellers[0];

  // Category tiles use the first product photo in each category (real data)
  const tiles = useMemo(
    () =>
      tree
        .map((c: any) => ({ ...c, cover: products.find((p: any) => p.categoryId === c.id) }))
        .filter((c: any) => c.cover)
        .slice(0, 4),
    [tree, products],
  );

  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[460px] items-end overflow-hidden md:min-h-[640px] md:items-center" style={{ background: CREAM }}>
        {hero && <img src={productImages(hero)[1] ?? productImages(hero)[0]} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent md:bg-gradient-to-r md:from-black/45 md:via-black/10" />
        <div className="page-width relative z-10 pb-[36px] md:pb-0">
          <div className="max-w-[520px] text-white">
            <h1 className="store-heading !text-white text-[38px] leading-[1.1] md:text-[60px]">{BRAND.heroTitle || STORE.name}</h1>
            <p className="mt-[12px] text-[16px] text-white/90 md:text-[18px]">{BRAND.heroText || st("hero_text")}</p>
            <Link href={collectionUrl(locale)} className="btn mt-[26px] !bg-white !text-[#121212] !shadow-none hover:!bg-[#f0ebe5]">
              {st("shop_all")}
            </Link>
          </div>
        </div>
      </section>
      <div className="page-width mt-[10px]">
        {!BRAND.heroTitle && <DevHint>BRAND.heroTitle / heroText in src/config/store.ts: your one-line promise (only what is true).</DevHint>}
      </div>

      {/* Shop by category (REFY grid) */}
      {tiles.length >= 2 && (
        <section className="page-width pt-[44px] md:pt-[60px]">
          <h2 className="store-heading text-[24px] md:text-[30px]">{st("shop_by_category")}</h2>
          <div className="mt-[20px] grid grid-cols-2 gap-[8px] md:grid-cols-4 md:gap-[16px]">
            {tiles.map((c: any) => (
              <Link key={c.id} href={collectionUrl(locale, c.id)} className="group block">
                <div className="aspect-square overflow-hidden" style={{ background: CREAM }}>
                  <img src={productImages(c.cover)[0]} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                </div>
                <p className="mt-[10px] text-[16px] font-semibold text-[#121212] group-hover:underline underline-offset-[3px]">{c.categoryName} →</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Best sellers */}
      <section className="page-width py-[44px] md:py-[60px]">
        <div className="flex items-end justify-between gap-[16px]">
          <h2 className="store-heading text-[24px] md:text-[30px]">{st("best_sellers")}</h2>
          <Link href={collectionUrl(locale)} className="shrink-0 text-[15px] text-[#121212] underline underline-offset-[3px]">
            {st("view_all")}
          </Link>
        </div>
        <div className="mt-[20px] grid grid-cols-2 gap-x-[8px] gap-y-[28px] md:grid-cols-4 md:gap-x-[16px] md:gap-y-[40px]">
          {isLoading ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />) : bestSellers.map((p: any) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* Brand values (REFY "Simplifying Beauty" strip) */}
      {BRAND.values.length > 0 ? (
        <section style={{ background: CREAM }}>
          <div className="page-width py-[44px] md:py-[60px]">
            <h2 className="store-heading text-center text-[24px] md:text-[30px]">{st("our_values")}</h2>
            <ul className={`mt-[28px] grid gap-[24px] text-center ${VALUE_COLS[Math.min(BRAND.values.length, 4)]}`}>
              {BRAND.values.slice(0, 4).map((v) => (
                <li key={v.title}>
                  <h3 className="store-heading text-[18px]">{v.title}</h3>
                  <p className="mt-[6px] text-[15px]">{v.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : (
        <div className="page-width">
          <DevHint>BRAND.values in src/config/store.ts: up to 4 short brand promises (e.g. «Веган», «Амьтанд туршаагүй»). Only true ones.</DevHint>
        </div>
      )}

      {/* Spotlight: image with text */}
      {spotlight && (
        <section className="page-width py-[44px] md:py-[60px]">
          <div className="grid md:grid-cols-2">
            <Link href={productUrl(locale, spotlight.id)} className="block aspect-square" style={{ background: CREAM }}>
              <img src={productImages(spotlight)[0]} alt={spotlight.foodName} className="h-full w-full object-cover" />
            </Link>
            <div className="flex flex-col justify-center px-[24px] py-[36px] md:px-[60px]" style={{ background: CREAM }}>
              <Stars avg={Number(spotlight.avgRating ?? 0)} count={Number(spotlight.reviewCount ?? 0)} showAvg />
              <h2 className="store-heading mt-[8px] text-[28px] md:text-[36px]">{spotlight.foodName}</h2>
              {spotlight.ingredients && <p className="mt-[14px] text-[15px] leading-relaxed whitespace-pre-line line-clamp-6">{spotlight.ingredients}</p>}
              <Price product={spotlight} className="mt-[16px] text-[18px]" />
              <div className="mt-[24px]">
                <Link href={productUrl(locale, spotlight.id)} className="btn">
                  {st("learn_more")}
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Real customer reviews */}
      {reviews.length > 0 && (
        <section className="page-width pb-[44px] md:pb-[60px]">
          <h2 className="store-heading text-[24px] md:text-[30px]">{st("customers_say")}</h2>
          <ul className="mt-[20px] flex snap-x gap-[12px] overflow-x-auto pb-[6px] [scrollbar-width:none] md:grid md:grid-cols-3 md:overflow-visible">
            {reviews.map((r) => (
              <li key={r.id} className="w-[80%] shrink-0 snap-start p-[22px] md:w-auto" style={{ background: CREAM }}>
                <Stars avg={r.rating} count={1} size={14} hideCount />
                <p className="mt-[10px] text-[15px] leading-relaxed text-[#121212] line-clamp-5">“{r.comment}”</p>
                <p className="mt-[12px] text-[13px]">
                  {r.name ?? ""}
                  {r.verifiedPurchase && <span className="ml-[6px] text-[rgba(18,18,18,0.6)]">· {st("verified")}</span>}
                </p>
                {r.product && (
                  <Link href={productUrl(locale, r.product.id)} className="mt-[12px] flex items-center gap-[10px] text-[13px] text-[#121212] hover:underline">
                    <img src={r.product.image} alt="" className="h-[36px] w-[36px] object-cover" />
                    {r.product.name}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Delivery / payment / tracking facts */}
      <section className="border-t border-[rgba(18,18,18,0.08)]">
        <ul className="page-width grid gap-[28px] py-[40px] text-center md:grid-cols-3">
          {[
            { icon: Truck, title: st("delivery_title"), text: st("delivery_text", { fee: money(DELIVERY_FEE) }) },
            { icon: CreditCard, title: st("payment_title"), text: st("payment_text") },
            { icon: PackageSearch, title: st("tracking_title"), text: st("tracking_text") },
          ].map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex flex-col items-center px-[10px]">
              <Icon className="h-[28px] w-[28px] text-[#121212]" strokeWidth={1.2} />
              <h3 className="store-heading mt-[12px] text-[17px]">{title}</h3>
              <p className="mt-[4px] text-[14px]">{text}</p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
