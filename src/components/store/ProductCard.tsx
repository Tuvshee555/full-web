/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { addToCart } from "./lib/cart";
import { isSoldOut, onSale, productImages, productUrl, sizeLabel, sizeSoldOut } from "./lib/product";
import { useStoreT } from "./lib/useStoreT";
import { Badge, Price, salePercent } from "./ui";

/** Clean product card: photo (2nd photo on hover), small badge, name, price.
 *  Quick add is a small "+" on the photo instead of a big button per card. */
export function ProductCard({ product, quickAdd = true }: { product: any; quickAdd?: boolean }) {
  const { st, locale } = useStoreT();
  const router = useRouter();
  const images = productImages(product);
  const soldOut = isSoldOut(product);
  const sizes: any[] = Array.isArray(product.sizes) ? product.sizes : [];
  const href = productUrl(locale, product.id);

  // One size (or none): add straight to cart. Several sizes: pick on the product page.
  const onQuickAdd = () => {
    if (sizes.length > 1) return router.push(href);
    const only = sizes[0];
    addToCart(product, 1, only && !sizeSoldOut(only) ? sizeLabel(only) : null);
  };

  return (
    <div className="group relative">
      <div className="relative aspect-square overflow-hidden bg-[#f3f3f3]">
        <Link href={href} className="absolute inset-0" aria-label={product.foodName}>
          <img
            src={images[0]}
            alt={product.foodName ?? ""}
            className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-500
              md:group-hover:scale-[1.03] ${images[1] ? "md:group-hover:opacity-0" : ""}`}
            loading="lazy"
            draggable={false}
          />
          {images[1] && (
            <img
              src={images[1]}
              alt=""
              aria-hidden
              className="absolute inset-0 hidden h-full w-full object-cover opacity-0 transition-[opacity,transform] duration-500
                md:block md:group-hover:scale-[1.03] md:group-hover:opacity-100"
              loading="lazy"
              draggable={false}
            />
          )}
        </Link>

        <div className="pointer-events-none absolute left-[8px] top-[8px] z-10">
          {soldOut ? (
            <Badge kind="soldout">{st("sold_out")}</Badge>
          ) : (
            onSale(product) && <Badge kind="sale">-{salePercent(product)}%</Badge>
          )}
        </div>

        {quickAdd && !soldOut && (
          <button
            type="button"
            onClick={onQuickAdd}
            aria-label={st("add_to_cart")}
            title={st("add_to_cart")}
            className="absolute bottom-[8px] right-[8px] z-10 flex h-[38px] w-[38px] items-center justify-center bg-white text-[#121212]
              shadow-[0_2px_8px_rgba(0,0,0,0.12)] transition-all hover:bg-[#121212] hover:text-white
              md:translate-y-[6px] md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100"
          >
            <Plus className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </button>
        )}
      </div>

      <div className="pt-[10px]">
        <h3 className="text-[15px] font-medium leading-snug text-[#121212] line-clamp-2">
          <Link href={href} className="link-underline">
            {product.foodName}
          </Link>
        </h3>
        <Price product={product} className="mt-[4px] text-[15px]" />
      </div>
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-square bg-[#f3f3f3]" />
      <div className="mt-[12px] h-[16px] w-3/4 bg-[#f3f3f3]" />
      <div className="mt-[8px] h-[16px] w-1/3 bg-[#f3f3f3]" />
    </div>
  );
}
