/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CreditCard, PackageSearch, Truck } from "lucide-react";
import { STORE } from "@/config/store";
import { DELIVERY_FEE } from "@/data/mongoliaLocations";
import { useFood } from "@/hooks/useFood";
import { ProductCard, ProductCardSkeleton } from "./ProductCard";
import { collectionUrl, money, productImages, productUrl } from "./lib/product";
import { useStoreT } from "./lib/useStoreT";
import { Price } from "./ui";

export function HomePage() {
  const { st, locale } = useStoreT();
  const { data: products = [], isLoading } = useFood();

  // Featured first, then best sellers, then newest: drives every section.
  const ranked = useMemo(
    () =>
      [...products].sort(
        (a: any, b: any) =>
          Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured)) ||
          Number(b.salesCount ?? 0) - Number(a.salesCount ?? 0) ||
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [products],
  );
  const hero = ranked[0];
  const spotlight = ranked[0];
  const featured = ranked.slice(0, 8);

  return (
    <>
      {/* Image banner */}
      <section className="relative flex min-h-[420px] md:min-h-[620px] items-center justify-center overflow-hidden bg-[#f3f3f3]">
        {hero && <img src={productImages(hero)[0]} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 px-[20px] text-center text-white">
          <h1 className="store-heading !text-white text-[40px] md:text-[52px]">{STORE.name}</h1>
          <p className="mt-[10px] text-[16px] tracking-[0.06rem] text-white/90">{st("hero_text")}</p>
          <Link href={collectionUrl(locale)} className="btn mt-[30px] !bg-white !text-[#121212] !shadow-[0_0_0_1px_#fff] hover:!shadow-[0_0_0_2px_#fff]">
            {st("shop_all")}
          </Link>
        </div>
      </section>

      {/* Featured collection */}
      <section className="page-width py-[36px] md:py-[52px]">
        <h2 className="store-heading text-[24px] md:text-[30px]">{st("featured_products")}</h2>
        <div className="mt-[24px] grid grid-cols-2 gap-x-[8px] gap-y-[24px] md:grid-cols-4 md:gap-x-[16px] md:gap-y-[36px]">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : featured.map((p: any) => <ProductCard key={p.id} product={p} />)}
        </div>
        <div className="mt-[36px] flex justify-center">
          <Link href={collectionUrl(locale)} className="btn">
            {st("view_all")}
          </Link>
        </div>
      </section>

      {/* Image with text */}
      {spotlight && (
        <section className="page-width py-[20px] md:py-[36px]">
          <div className="grid md:grid-cols-2">
            <Link href={productUrl(locale, spotlight.id)} className="block aspect-square bg-[#f3f3f3]">
              <img src={productImages(spotlight)[1] ?? productImages(spotlight)[0]} alt={spotlight.foodName} className="h-full w-full object-cover" />
            </Link>
            <div className="flex flex-col justify-center bg-[rgba(18,18,18,0.04)] px-[30px] py-[40px] md:px-[60px]">
              <h2 className="store-heading text-[28px] md:text-[34px]">{spotlight.foodName}</h2>
              {spotlight.ingredients && <p className="mt-[16px] text-[15px] leading-relaxed whitespace-pre-line line-clamp-6">{spotlight.ingredients}</p>}
              <Price product={spotlight} className="mt-[16px] text-[18px]" />
              <div className="mt-[28px]">
                <Link href={productUrl(locale, spotlight.id)} className="btn">
                  {st("learn_more")}
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Multicolumn */}
      <section className="page-width py-[36px] md:py-[52px]">
        <ul className="grid gap-[30px] text-center md:grid-cols-3">
          {[
            { icon: Truck, title: st("delivery_title"), text: st("delivery_text", { fee: money(DELIVERY_FEE) }) },
            { icon: CreditCard, title: st("payment_title"), text: st("payment_text") },
            { icon: PackageSearch, title: st("tracking_title"), text: st("tracking_text") },
          ].map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex flex-col items-center px-[10px]">
              <Icon className="h-[30px] w-[30px] text-[#121212]" strokeWidth={1.2} />
              <h3 className="store-heading mt-[14px] text-[18px]">{title}</h3>
              <p className="mt-[6px] text-[14px]">{text}</p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
