/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { addToCart } from "./lib/cart";
import { productContent } from "@/config/store";
import { firstLine, isBestseller, isSoldOut, onSale, priceRange, productImages, productUrl, rating, sizeLabel, sizeSoldOut } from "./lib/product";
import { useStoreT } from "./lib/useStoreT";
import { Badge, Price, salePercent, Stars } from "./ui";
import { StockBadge } from "./StockBadge";
import { imageSrcSet, imageUrl } from "@/lib/image";

/** Clean product card: photo (2nd photo on hover), small badge, name, price.
 *  Quick add is a small "+" on the photo instead of a big button per card. */
/** `headingLevel`: 3 under a section heading (home, related), 2 when the page's own title is the h1 (collections). */
export function ProductCard({ product, quickAdd = true, headingLevel = 3 }: { product: any; quickAdd?: boolean; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const { st, locale } = useStoreT();
  const router = useRouter();
  const images = productImages(product);
  const soldOut = isSoldOut(product);
  const sizes: any[] = Array.isArray(product.sizes) ? product.sizes : [];
  const href = productUrl(locale, product.id);
  const stars = rating(product);
  const subtitle = productContent(product.id).tagline || firstLine(product.ingredients);

  // ABH-style badges, all from real data: sale % and best seller (real sales).
  // No automatic "new" badge: in a young store every product is new, so it's noise.
  const badges = [
    onSale(product) && priceRange(product).min === priceRange(product).max && <Badge key="sale" kind="sale">-{salePercent(product)}%</Badge>,
    isBestseller(product) && <Badge key="best" kind="label">{st("badge_best")}</Badge>,
  ].filter(Boolean);

  // One size (or none): add straight to cart. Several sizes: pick on the product page.
  const onQuickAdd = () => {
    if (sizes.length > 1) return router.push(href);
    const only = sizes[0];
    addToCart(product, 1, only && !sizeSoldOut(only) ? sizeLabel(only) : null);
  };

  return (
    <div className="group relative">
      <div className="relative aspect-[4/5] overflow-hidden bg-sand">
        <Link href={href} className="absolute inset-0" aria-label={product.productName}>
          <img
            src={imageUrl(images[0], 640)}
            srcSet={imageSrcSet(images[0], [320, 480, 640, 960])}
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
            alt={product.productName ?? ""}
            className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-300 ease-silk
              md:group-hover:scale-[1.04] ${images[1] ? "md:group-hover:opacity-0" : ""}`}
            loading="lazy"
            draggable={false}
          />
          {images[1] && (
            <img
              src={imageUrl(images[1], 640)}
              srcSet={imageSrcSet(images[1], [320, 480, 640, 960])}
              sizes="(min-width: 1024px) 25vw, 33vw"
              alt=""
              aria-hidden
              className="absolute inset-0 hidden h-full w-full object-cover opacity-0 transition-[opacity,transform] duration-300 ease-silk
                md:block md:group-hover:scale-[1.04] md:group-hover:opacity-100"
              loading="lazy"
              draggable={false}
            />
          )}
        </Link>

        <div className="pointer-events-none absolute left-[10px] top-[10px] z-10 flex flex-col items-start gap-[4px]">
          {soldOut ? (
            <Badge kind="soldout">{st("sold_out")}</Badge>
          ) : (
            badges.slice(0, 2)
          )}
        </div>

        {quickAdd && !soldOut && (
          <button
            type="button"
            onClick={onQuickAdd}
            aria-label={st("add_to_cart")}
            title={st("add_to_cart")}
            className="absolute bottom-[10px] right-[10px] z-10 flex h-[44px] w-[44px] items-center justify-center bg-paper text-ink
              shadow-[0_10px_30px_-10px_rgba(28,23,20,0.35)] transition-[transform,opacity,background-color,color] duration-500 ease-silk
              hover:bg-ink hover:text-paper active:scale-95
              "
          >
            <Plus className="h-[18px] w-[18px]" strokeWidth={1.2} />
          </button>
        )}
      </div>

      <div className="pt-[14px]">
        {/* Phones: price under the name. Desktop: price right-aligned beside it. */}
        <div className="flex flex-col gap-[8px]">
          <Heading className="text-[15px] font-medium leading-[1.4] text-ink sm:text-[16px] line-clamp-2">
            <Link href={href} className="-my-[6px] inline-block py-[6px]">{product.productName}</Link>
          </Heading>
          <Price product={product} className="text-[14px] sm:text-[15px]" />
        </div>
        {subtitle && <p className="mt-[4px] text-[13px] text-taupe line-clamp-1">{subtitle}</p>}
        <Stars avg={stars.avg} count={stars.count} size={11} className="mt-[6px]" />
        <StockBadge level={product.stockLevel} locale={locale} />
      </div>
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[4/5] bg-sand" />
      <div className="mt-[12px] h-[16px] w-3/4 bg-[#efe7dd]" />
      <div className="mt-[8px] h-[16px] w-1/3 bg-[#efe7dd]" />
    </div>
  );
}
