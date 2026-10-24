"use client";

import Link from "next/link";
import { imageUrl } from "@/lib/image";
import { Trash2 } from "lucide-react";
import { cartSubtotal, setQuantity } from "@/components/store/lib/cart";
import { useStoreCart } from "@/components/store/lib/useCart";
import { collectionUrl, money, productUrl } from "@/components/store/lib/product";
import { useStoreT } from "@/components/store/lib/useStoreT";
import { QuantityInput } from "@/components/store/ui";
import { CartTotals } from "@/components/store/CartTotals";
import { ProductImage } from "@/components/store/ProductImage";

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
            const href = productUrl(locale, item.productId);
            return (
              <li key={`${item.productId}-${item.selectedSize ?? ""}`} className="flex gap-[16px] border-b border-ink/15 py-[24px] sm:gap-[24px]">
                <Link href={href} className="h-[104px] w-[80px] shrink-0 bg-sand sm:h-[140px] sm:w-[112px]">
                  <ProductImage src={imageUrl(item.product?.image ?? "", 240)} alt={item.product?.productName} className="h-full w-full object-contain" />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={href} className="text-[15px] font-medium leading-snug text-ink link-underline sm:text-[17px]">{item.product?.productName}</Link>
                  {item.selectedSize && <p className="mt-[4px] text-[13px] text-taupe">{st("size")}: {item.selectedSize}</p>}
                  <p className="mt-[6px] text-[15px] font-medium text-ink tabular-nums">{money(Number(item.product?.price ?? 0) * item.quantity)}</p>
                  <div className="mt-[14px] flex flex-wrap items-center gap-[8px]">
                    <QuantityInput small value={item.quantity} onChange={(v) => setQuantity(item.productId, item.selectedSize, v)} />
                    <button type="button" aria-label={`${st("remove")}: ${item.product?.productName}`} className="flex h-[44px] w-[44px] items-center justify-center text-taupe hover:bg-sand hover:text-ink" onClick={() => setQuantity(item.productId, item.selectedSize, 0)}><Trash2 className="h-[17px] w-[17px]" strokeWidth={1.5} /></button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <aside className="border border-ink/10 bg-sand/60 p-[24px] lg:sticky lg:top-[108px]">
          <h2 className="text-[17px] font-medium text-ink">{st("order_summary")}</h2>
          <div className="mt-6"><CartTotals subtotal={cartSubtotal(items)} /></div>
          <Link href={`/${locale}/checkout`} className="btn mt-[24px] w-full">{st("checkout")}</Link>
        </aside>
      </div>
    </div>
  );
}
