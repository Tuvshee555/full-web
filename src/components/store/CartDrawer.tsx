/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { cartSubtotal, setQuantity, type StoreCartItem } from "./lib/cart";
import { useStoreCart } from "./lib/useCart";
import { collectionUrl, money, productUrl } from "./lib/product";
import { useStoreT } from "./lib/useStoreT";
import { Drawer, QuantityInput } from "./ui";

/** Shopify Dawn cart drawer: opens on "Add to cart" and from the header bag icon. */
export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { st, locale } = useStoreT();
  const router = useRouter();
  const { items } = useStoreCart();
  const empty = items.length === 0;

  return (
    <Drawer open={open} onClose={onClose} title={empty ? undefined : st("your_cart")}>
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
          <div className="mx-[20px] md:mx-[30px] flex justify-between border-b border-[rgba(28,23,20,0.08)] pb-[10px] text-[10px] uppercase tracking-[0.06em] text-[rgba(28,23,20,0.75)]">
            <span>{st("product")}</span>
            <span>{st("total")}</span>
          </div>
          <ul className="flex-1 overflow-y-auto px-[20px] md:px-[30px]">
            {items.map((item) => (
              <CartLine key={`${item.foodId}-${item.selectedSize ?? ""}`} item={item} onNavigate={onClose} locale={locale} />
            ))}
          </ul>
          <div className="border-t border-[rgba(28,23,20,0.08)] px-[20px] md:px-[30px] pt-[20px] pb-[25px]">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-ink text-[16px]">{st("estimated_total")}</h3>
              <span className="text-[16px] tracking-normal text-[#1c1714]">{money(cartSubtotal(items))}</span>
            </div>
            <p className="mt-[8px] text-[13px]">{st("shipping_note")}</p>
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
  const href = productUrl(locale, item.foodId);
  return (
    <li className="flex gap-[15px] py-[20px] border-b border-[rgba(28,23,20,0.08)] last:border-0">
      <Link href={href} onClick={onNavigate} className="h-[96px] w-[96px] shrink-0 bg-[#efe7dd]">
        {item.food?.image ? <img src={item.food.image} alt="" className="h-full w-full object-cover" /> : null}
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-[10px]">
          <Link href={href} onClick={onNavigate} className="font-medium text-ink text-[15px] link-underline">
            {item.food?.foodName}
          </Link>
          <span className="shrink-0 text-[15px] tracking-normal text-[#1c1714]">
            {money(Number(item.food?.price ?? 0) * item.quantity)}
          </span>
        </div>
        <p className="mt-[2px] text-[14px]">{money(item.food?.price)}</p>
        {item.selectedSize && (
          <p className="text-[14px]">
            {st("size")}: {item.selectedSize}
          </p>
        )}
        <div className="mt-[10px] flex items-center gap-[10px]">
          <QuantityInput small value={item.quantity} onChange={(v) => setQuantity(item.foodId, item.selectedSize, v)} />
          <button
            type="button"
            aria-label={st("remove")}
            className="p-[8px] text-[#1c1714]"
            onClick={() => setQuantity(item.foodId, item.selectedSize, 0)}
          >
            <Trash2 className="h-[16px] w-[16px]" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </li>
  );
}
