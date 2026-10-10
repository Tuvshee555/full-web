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
    <div className="page-width py-[30px] md:py-[40px]">
      <div className="flex items-center justify-between">
        <h1 className="store-heading text-[30px] md:text-[40px]">{st("your_cart")}</h1>
        <Link href={collectionUrl(locale)} className="text-[14px] text-[#1c1714] underline underline-offset-[3px]">
          {st("continue_shopping")}
        </Link>
      </div>

      <table className="mt-[30px] w-full">
        <thead>
          <tr className="border-b border-[rgba(28,23,20,0.08)] text-left text-[10px] uppercase tracking-[0.06em]">
            <th className="pb-[12px] font-normal">{st("product")}</th>
            <th className="hidden pb-[12px] font-normal md:table-cell">{st("quantity")}</th>
            <th className="pb-[12px] text-right font-normal">{st("total")}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const href = productUrl(locale, item.foodId);
            const qty = (
              <div className="flex items-center gap-[10px]">
                <QuantityInput value={item.quantity} onChange={(v) => setQuantity(item.foodId, item.selectedSize, v)} />
                <button type="button" aria-label={st("remove")} className="p-[8px] text-[#1c1714]" onClick={() => setQuantity(item.foodId, item.selectedSize, 0)}>
                  <Trash2 className="h-[16px] w-[16px]" strokeWidth={1.5} />
                </button>
              </div>
            );
            return (
              <tr key={`${item.foodId}-${item.selectedSize ?? ""}`} className="border-b border-[rgba(28,23,20,0.08)] align-top">
                <td className="py-[24px] pr-[10px]">
                  <div className="flex gap-[20px]">
                    <Link href={href} className="h-[100px] w-[100px] md:h-[120px] md:w-[120px] shrink-0 bg-[#efe7dd]">
                      {item.food?.image ? <img src={item.food.image} alt="" className="h-full w-full object-cover" /> : null}
                    </Link>
                    <div>
                      <Link href={href} className="font-medium text-ink text-[15px] md:text-[16px] link-underline">
                        {item.food?.foodName}
                      </Link>
                      <p className="mt-[4px] text-[14px]">{money(item.food?.price)}</p>
                      {item.selectedSize && (
                        <p className="text-[14px]">
                          {st("size")}: {item.selectedSize}
                        </p>
                      )}
                      <div className="mt-[12px] md:hidden">{qty}</div>
                    </div>
                  </div>
                </td>
                <td className="hidden py-[24px] md:table-cell">{qty}</td>
                <td className="py-[24px] text-right text-[15px] tracking-normal text-[#1c1714]">
                  {money(Number(item.food?.price ?? 0) * item.quantity)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-[36px] flex justify-end">
        <div className="w-full md:w-[360px] text-center md:text-right">
          <div className="flex items-baseline justify-center gap-[16px] md:justify-end">
            <h2 className="font-medium text-ink text-[16px]">{st("estimated_total")}</h2>
            <span className="text-[18px] tracking-normal text-[#1c1714]">{money(cartSubtotal(items))}</span>
          </div>
          <p className="mt-[8px] text-[13px]">{st("shipping_note")}</p>
          <Link href={`/${locale}/checkout`} className="btn mt-[18px] w-full">
            {st("checkout")}
          </Link>
        </div>
      </div>
    </div>
  );
}
