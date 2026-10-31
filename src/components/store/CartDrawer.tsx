"use client";

import Link from "next/link";
import { imageUrl } from "@/lib/image";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { cartSubtotal, setQuantity, type StoreCartItem } from "./lib/cart";
import { useStoreCart } from "./lib/useCart";
import { collectionUrl, money, productUrl } from "./lib/product";
import { useStoreT } from "./lib/useStoreT";
import { Drawer, QuantityInput } from "./ui";
import { CartTotals } from "./CartTotals";
import { ProductImage } from "./ProductImage";

/** Shopify Dawn cart drawer: opens on "Add to cart" and from the header bag icon. */
export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { st, locale } = useStoreT();
  const router = useRouter();
  const { items } = useStoreCart();
  const empty = items.length === 0;

  return (
    <Drawer open={open} onClose={onClose} title={st("your_cart")}>
      {empty ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-[25px] px-[30px] text-center">
          <h2 className="store-heading text-[24px]">{st("cart_empty")}</h2>
          <button
            type="button"
            className="btn"
            onClick={() => {
              onClose();
              router.push(collectionUrl(locale));
            }}
          >
            {st("continue_shopping")}
          </button>
        </div>
      ) : (
        <>
          <ul className="flex-1 overflow-y-auto px-[20px] md:px-[30px]">
            {items.map((item) => (
              <CartLine key={`${item.productId}-${item.selectedSize ?? ""}`} item={item} onNavigate={onClose} locale={locale} />
            ))}
          </ul>
          <div className="border-t border-[rgba(28,23,20,0.08)] px-[20px] md:px-[30px] pt-[20px] pb-[25px]">
            <CartTotals subtotal={cartSubtotal(items)} />
            <button
              type="button"
              className="btn mt-[18px] w-full"
              onClick={() => {
                onClose();
                router.push(`/${locale}/checkout`);
              }}
            >
              {st("checkout")}
            </button>
          </div>
        </>
      )}
    </Drawer>
  );
}

function CartLine({ item, onNavigate, locale }: { item: StoreCartItem; onNavigate: () => void; locale: string }) {
  const { st } = useStoreT();
  const href = productUrl(locale, item.productId);
  return (
    <li className="flex gap-[15px] py-[20px] border-b border-[rgba(28,23,20,0.08)] last:border-0">
      <Link href={href} onClick={onNavigate} tabIndex={-1} aria-hidden className="product-media h-[90px] w-[72px] shrink-0 sm:h-[110px] sm:w-[88px]">
        <ProductImage src={imageUrl(item.product?.image ?? "", 240)} alt="" className="absolute inset-0" />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-[10px] gap-y-[4px]">
          <Link href={href} onClick={onNavigate} className="font-medium text-ink text-[15px] link-underline">
            {item.product?.productName}
          </Link>
          <span className="shrink-0 text-[15px] tracking-normal text-[#1c1714]">
            {money(Number(item.product?.price ?? 0) * item.quantity)}
          </span>
        </div>
        <p className="mt-[2px] text-[14px]">{money(item.product?.price)}</p>
        {item.selectedSize && (
          <p className="text-[14px]">
            {st("size")}: {item.selectedSize}
          </p>
        )}
        <div className="mt-[10px] flex items-center gap-[10px]">
          <QuantityInput small value={item.quantity} onChange={(v) => setQuantity(item.productId, item.selectedSize, v)} />
          <button
            type="button"
            aria-label={`${st("remove")}: ${item.product?.productName ?? ""}`}
            className="flex h-[44px] w-[44px] items-center justify-center text-[#1c1714] hover:bg-sand"
            onClick={() => setQuantity(item.productId, item.selectedSize, 0)}
          >
            <Trash2 aria-hidden className="h-[16px] w-[16px]" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </li>
  );
}
