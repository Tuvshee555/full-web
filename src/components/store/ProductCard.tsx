/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { addToCart } from "./lib/cart";
import { isBestseller, isSoldOut, onSale, priceRange, productImages, productUrl, rating, sizeLabel, sizeSoldOut } from "./lib/product";
import { useStoreT } from "./lib/useStoreT";
import { Badge, Price, salePercent, Stars } from "./ui";
import { StockBadge } from "./StockBadge";
import { ProductImage } from "./ProductImage";
import { imageSrcSet, imageUrl } from "@/lib/image";

/** Product card: full-bleed photo (2nd photo on hover), real badges, category, name, price.
 *  `headingLevel`: 3 under a section heading (home, related), 2 when the page's own title is the h1 (collections). */
export function ProductCard({ product, quickAdd = true, headingLevel = 3 }: { product: any; quickAdd?: boolean; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const { st, locale } = useStoreT();
  const router = useRouter();
  const images = productImages(product);
  const soldOut = isSoldOut(product);
  const sizes: any[] = Array.isArray(product.sizes) ? product.sizes : [];
  const href = productUrl(locale, product.id);
  const stars = rating(product);
  const category = product.category && typeof product.category === "object" ? product.category.categoryName : null;
  // Several options: the shopper picks one on the product page; say so instead of "add".
  const choose = sizes.length > 1;
  const action = choose ? st("choose_option") : st("add_to_cart");

  // Real data only: sale % and best seller (real sales). No automatic "new" badge.
  const badges = [
    onSale(product) && priceRange(product).min === priceRange(product).max && <Badge key="sale" kind="sale">-{salePercent(product)}%</Badge>,
    isBestseller(product) && <Badge key="best" kind="label">{st("badge_best")}</Badge>,
  ].filter(Boolean);

  const onQuickAdd = () => {
    if (choose) return router.push(href);
    const only = sizes[0];
    addToCart(product, 1, only && !sizeSoldOut(only) ? sizeLabel(only) : null);
  };

  return (
    <div className="group relative flex min-w-0 flex-col">
      <div className="product-media aspect-[4/5]">
        {/* The name link below covers the whole card, so the photo needs no link of its own. */}
        <div className="absolute inset-0">
          <ProductImage
            src={imageUrl(images[0], 640)}
            srcSet={imageSrcSet(images[0], [320, 480, 640, 960])}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            alt=""
            className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-500 ease-silk
              md:group-hover:scale-[1.03] ${images[1] ? "md:group-hover:opacity-0" : ""}`}
            loading="lazy"
            draggable={false}
          />
          {images[1] && (
            <ProductImage
              src={imageUrl(images[1], 640)}
              srcSet={imageSrcSet(images[1], [320, 480, 640, 960])}
              sizes="(min-width: 1024px) 25vw, 33vw"
              alt=""
              className="absolute inset-0 hidden h-full w-full object-cover opacity-0 transition-[opacity,transform] duration-500 ease-silk
                md:block md:group-hover:scale-[1.03] md:group-hover:opacity-100"
              loading="lazy"
              draggable={false}
            />
          )}
        </div>

        <div className="pointer-events-none absolute left-[10px] top-[10px] z-10 flex flex-col items-start gap-[4px]">
          {soldOut ? <Badge kind="soldout">{st("sold_out")}</Badge> : badges.slice(0, 2)}
        </div>

        {quickAdd && !soldOut && (
          <>
            {/* Mouse: a labelled bar slides up over the photo (also on keyboard focus). */}
            <button
              type="button"
              onClick={onQuickAdd}
              aria-label={`${action}: ${product.productName}`}
              className="absolute inset-x-0 bottom-0 z-10 hidden min-h-[46px] translate-y-full items-center justify-center gap-[8px] bg-ink px-[12px] text-[13px] font-medium text-paper transition-transform duration-300 ease-silk
                hover:bg-espresso focus-visible:translate-y-0 group-hover:translate-y-0 [@media(hover:hover)]:flex"
            >
              {!choose && <Plus aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.6} />}
              {action}
            </button>
            {/* Touch: a compact button that is always there. */}
            <button
              type="button"
              onClick={onQuickAdd}
              aria-label={`${action}: ${product.productName}`}
              className="absolute bottom-[8px] right-[8px] z-10 flex h-[44px] w-[44px] items-center justify-center bg-paper text-ink shadow-[0_8px_24px_-10px_rgba(28,23,20,0.4)] active:scale-95 [@media(hover:hover)]:hidden"
            >
              <Plus aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.4} />
            </button>
          </>
        )}
      </div>

      <div className="flex flex-1 flex-col pt-[12px]">
        {category && <p className="truncate text-[12px] text-taupe">{category}</p>}
        <Heading className="mt-[3px] line-clamp-2 text-[15px] font-medium leading-[1.4] text-ink sm:text-[16px]">
          <Link href={href} className="after:absolute after:inset-x-0 after:top-0 after:h-full after:content-[''] focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-ink">
            {product.productName}
          </Link>
        </Heading>
        <Price product={product} className="mt-[6px] text-[14px] sm:text-[15px]" />
        <Stars avg={stars.avg} count={stars.count} size={11} className="mt-[6px]" />
        <span className="mt-[6px] empty:hidden"><StockBadge level={product.stockLevel} locale={locale} /></span>
      </div>
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[4/5] bg-sand" />
      <div className="mt-[12px] h-[12px] w-1/3 bg-sand" />
      <div className="mt-[8px] h-[16px] w-3/4 bg-sand" />
      <div className="mt-[8px] h-[16px] w-1/4 bg-sand" />
    </div>
  );
}
