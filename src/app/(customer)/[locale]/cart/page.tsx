/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { cartSubtotal, setQuantity } from "@/components/store/lib/cart";
import { useStoreCart } from "@/components/store/lib/useCart";
import { collectionUrl, money, productUrl } from "@/components/store/lib/product";
import { useStoreT } from "@/components/store/lib/useStoreT";
import { QuantityInput } from "@/components/store/ui";

export default function CartPage() {
  const { st, locale } = useStoreT();
  const { items, ready } = useStoreCart();

  if (!ready) return <div className="min-h-[60vh]" />;

  if (!items.length) {
    return (
      <div className="page-width flex min-h-[50vh] flex-col items-center justify-center gap-[25px] py-[60px] text-center">
        <h1 className="store-heading text-[30px] md:text-[40px]">{st("cart_empty")}</h1>
        <Link href={collectionUrl(locale)} className="btn">
          {st("continue_shopping")}
        </Link>
      </div>
    );
  }

  return (
    <div className="page-width py-[32px] pb-[64px] lg:py-[56px]">
      <div className="flex flex-wrap items-end justify-between gap-[16px]">
        <h1 className="store-heading page-title">{st("your_cart")}</h1>
        <Link href={collectionUrl(locale)} className="inline-flex min-h-[44px] items-center text-[14px] text-ink underline underline-offset-4">{st("continue_shopping")}</Link>
      </div>
      <div className="mt-[28px] grid items-start gap-[32px] lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)] lg:gap-[48px]">
        <ul className="min-w-0 border-t border-ink/15">
          {items.map((item) => {
            const href = productUrl(locale, item.foodId);
            return (
              <li key={`${item.foodId}-${item.selectedSize ?? ""}`} className="flex gap-[16px] border-b border-ink/15 py-[24px] sm:gap-[24px]">
                <Link href={href} className="h-[104px] w-[80px] shrink-0 bg-sand sm:h-[140px] sm:w-[112px]">
                  {item.food?.image && <img src={item.food.image} alt={item.food.foodName} className="h-full w-full object-cover" />}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={href} className="text-[15px] font-medium leading-snug text-ink link-underline sm:text-[17px]">{item.food?.foodName}</Link>
                  {item.selectedSize && <p className="mt-[4px] text-[13px] text-taupe">{st("size")}: {item.selectedSize}</p>}
                  <p className="mt-[6px] text-[15px] font-medium text-ink tabular-nums">{money(Number(item.food?.price ?? 0) * item.quantity)}</p>
                  <div className="mt-[14px] flex flex-wrap items-center gap-[8px]">
                    <QuantityInput small value={item.quantity} onChange={(v) => setQuantity(item.foodId, item.selectedSize, v)} />
                    <button type="button" aria-label={`${st("remove")}: ${item.food?.foodName}`} className="flex h-[44px] w-[44px] items-center justify-center text-taupe hover:bg-sand hover:text-ink" onClick={() => setQuantity(item.foodId, item.selectedSize, 0)}><Trash2 className="h-[17px] w-[17px]" strokeWidth={1.5} /></button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <aside className="border border-ink/10 bg-sand/60 p-[24px] lg:sticky lg:top-[108px]">
          <h2 className="text-[17px] font-medium text-ink">{st("order_summary")}</h2>
          <div className="mt-[24px] flex flex-wrap items-baseline justify-between gap-[12px] border-t border-ink/15 pt-[20px]">
            <span className="text-[14px]">{st("estimated_total")}</span>
            <span className="text-[24px] font-medium text-ink tabular-nums">{money(cartSubtotal(items))}</span>
          </div>
          <p className="mt-[10px] text-[13px] text-taupe">{st("shipping_note")}</p>
          <Link href={`/${locale}/checkout`} className="btn mt-[24px] w-full">{st("checkout")}</Link>
        </aside>
      </div>
    </div>
  );
}
