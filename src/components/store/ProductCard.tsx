/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { addToCart } from "./lib/cart";
import { isSoldOut, onSale, productImages, productUrl, sizeLabel, sizeSoldOut } from "./lib/product";
import { useStoreT } from "./lib/useStoreT";
import { Badge, Price } from "./ui";

/** Dawn "standard" product card: image, badge bottom-left, title, price, quick add. */
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
    <div className="group relative flex h-full flex-col">
      <Link href={href} className="relative block aspect-square overflow-hidden bg-[#f3f3f3]">
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
        <div className="absolute bottom-[10px] left-[10px] z-10">
          {soldOut ? <Badge kind="soldout">{st("sold_out")}</Badge> : onSale(product) && <Badge kind="sale">{st("sale")}</Badge>}
        </div>
      </Link>

      <div className="flex flex-1 flex-col pt-[12px] pb-[4px]">
        <h3 className="store-heading text-[15px] md:text-[16px] leading-snug">
          <Link href={href} className="link-underline">
            {product.foodName}
          </Link>
        </h3>
        <Price product={product} className="mt-[6px] text-[15px] md:text-[16px]" />
        {quickAdd && (
          <div className="mt-auto pt-[14px]">
            <button
              type="button"
              className="btn-secondary w-full !min-h-[40px] !px-[10px] text-[14px]"
              disabled={soldOut}
              onClick={onQuickAdd}
            >
              {soldOut ? st("sold_out") : st("add_to_cart")}
            </button>
          </div>
        )}
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
