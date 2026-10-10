/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { STORE } from "@/config/store";
import { money } from "../lib/product";
import { useStoreT } from "../lib/useStoreT";

/** Shopify-style order status page in the Lorentz look: wordmark header,
 *  main content left, sand order summary right (collapsible on phones). */
export function OrderStatusShell({ order, children }: { order?: any; children: ReactNode }) {
  const { st, locale } = useStoreT();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-ink/10">
        <div className="flex h-[64px] items-center lg:h-[84px]">
          <div className="flex flex-1 lg:justify-end">
            {/* Order pages show only the wordmark (Shopify order status has no cart icon) */}
            <div className="mx-auto flex w-full max-w-[640px] items-center px-[20px] lg:mx-0 lg:px-[40px]">
              <Link href={`/${locale}`} className="store-heading text-[26px] lg:text-[30px]">
                {STORE.name}
              </Link>
            </div>
          </div>
          <div className="hidden lg:block lg:flex-1" />
        </div>
      </header>

      {order && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between border-b border-ink/10 bg-sand px-[20px] py-[16px] lg:hidden"
        >
          <span className="flex items-center gap-[6px] text-[14px]">
            {st("order_summary")}
            <ChevronDown className={`h-[14px] w-[14px] transition-transform duration-500 ease-silk ${open ? "rotate-180" : ""}`} strokeWidth={1.4} />
          </span>
          <span className="text-[17px] font-medium">{money(order.totalPrice)}</span>
        </button>
      )}
      {order && open && (
        <div className="border-b border-ink/10 bg-sand px-[20px] py-[22px] lg:hidden">
          <OrderSummary order={order} />
        </div>
      )}

      <div className="lg:flex lg:min-h-[calc(100vh-84px)]">
        <div className="lg:flex lg:flex-1 lg:justify-end lg:border-r lg:border-ink/10">
          <main className="mx-auto w-full max-w-[640px] px-[20px] py-[32px] lg:mx-0 lg:px-[40px] lg:py-[48px]">{children}</main>
        </div>
        <aside className="hidden bg-sand lg:block lg:flex-1">
          {order && (
            <div className="sticky top-0 max-w-[520px] px-[40px] py-[48px]">
              <OrderSummary order={order} />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export function OrderSummary({ order }: { order: any }) {
  const { st } = useStoreT();
  const fee = Number(order?.deliveryFee ?? 0);
  const total = Number(order?.totalPrice ?? 0);
  const d = order?.delivery ?? {};
  const place = [d.city, d.district, d.khoroo && `${d.khoroo}`].filter(Boolean).join(", ");

  return (
    <div className="text-[14px]">
      <ul className="space-y-[16px]">
        {(order?.items ?? []).map((it: any, i: number) => (
          <li key={it.id ?? i} className="flex items-center gap-[14px]">
            <div className="relative h-[64px] w-[64px] shrink-0 bg-paper">
              {it.food?.image ? <img src={it.food.image} alt="" className="h-full w-full object-cover" /> : null}
              <span className="absolute -right-[8px] -top-[8px] flex h-[20px] min-w-[20px] items-center justify-center rounded-full bg-ink px-[5px] text-[11px] text-paper">
                {it.quantity}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{it.food?.foodName}</p>
              {it.size && <p className="text-[12px] text-taupe">{it.size}</p>}
            </div>
            <span>{money(Number(it.food?.price ?? 0) * Number(it.quantity ?? 0))}</span>
          </li>
        ))}
      </ul>

      <dl className="mt-[24px] space-y-[8px] border-t border-ink/10 pt-[18px]">
        <div className="flex justify-between">
          <dt className="text-ink/70">{st("subtotal")}</dt>
          <dd>{money(Math.max(total - fee, 0))}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink/70">{st("shipping")}</dt>
          <dd>{money(fee)}</dd>
        </div>
        <div className="flex items-baseline justify-between pt-[10px]">
          <dt className="store-heading text-[24px]">{st("total")}</dt>
          <dd className="text-[19px] font-medium">
            <span className="mr-[8px] text-[11px] font-normal text-taupe">MNT</span>
            {money(total)}
          </dd>
        </div>
      </dl>

      {(place || d.address || d.phone) && (
        <div className="mt-[28px] grid gap-[18px] border-t border-ink/10 pt-[20px] sm:grid-cols-2">
          <div>
            <p className="eyebrow">{st("ship_to")}</p>
            <p className="mt-[8px] leading-relaxed">
              {place}
              {d.address && (
                <>
                  <br />
                  {d.address}
                </>
              )}
            </p>
          </div>
          <div>
            <p className="eyebrow">{st("recipient")}</p>
            <p className="mt-[8px] leading-relaxed">
              {[d.lastName, d.firstName].filter(Boolean).join(" ")}
              {d.phone && (
                <>
                  <br />
                  {d.phone}
                </>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
