/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ArrowLeft, ChevronDown, LockKeyhole } from "lucide-react";
import { STORE } from "@/config/store";
import { money } from "../lib/product";
import { useStoreT } from "../lib/useStoreT";
import { imageUrl } from "@/lib/image";

/** Shared, bounded checkout layout with a compact summary on phones. */
export function OrderStatusShell({ order, children }: { order?: any; children: ReactNode }) {
  const { st, locale } = useStoreT();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="border-b border-ink/10">
        <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between gap-[16px] px-[20px] sm:px-[32px] lg:h-[88px]">
          <Link href={`/${locale}`} className="store-heading flex min-h-[44px] items-center text-[30px]">{STORE.name}</Link>
          <span className="flex items-center gap-[7px] text-[12px] text-taupe"><LockKeyhole className="h-[14px] w-[14px]" aria-hidden />{st("secure_checkout")}</span>
        </div>
      </header>

      {order && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-order-summary"
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
        <div id="mobile-order-summary" className="border-b border-ink/10 bg-sand px-[20px] py-[22px] lg:hidden">
          <OrderSummary order={order} />
        </div>
      )}

      <div className={`mx-auto grid max-w-[1200px] gap-[48px] px-[20px] py-[28px] pb-[48px] sm:px-[32px] lg:py-[48px] ${order ? "lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]" : "max-w-[720px]"}`}>
        <section className="min-w-0">
          {children}
          <Link href={`/${locale}`} className="mt-[28px] inline-flex min-h-[44px] items-center gap-[8px] text-[13px] text-taupe hover:text-ink"><ArrowLeft className="h-[14px] w-[14px]" aria-hidden />{st("back_to_store")}</Link>
        </section>
        <aside className="hidden min-w-0 lg:block" aria-label={st("order_summary")}>
          {order && (
            <div className="sticky top-[32px] border border-ink/10 bg-sand/60 p-[28px]">
              <h2 className="mb-[24px] text-[17px] font-medium">{st("order_summary")}</h2>
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
  const place = [d.city, d.district, d.khoroo && st("khoroo_n", { n: d.khoroo })].filter(Boolean).join(", ");

  return (
    <div className="text-[14px]">
      <ul className="space-y-[16px]">
        {(order?.items ?? []).map((it: any, i: number) => (
          <li key={it.id ?? i} className="flex items-center gap-[14px]">
            <div className="relative h-[64px] w-[64px] shrink-0 bg-paper">
              {it.product?.image ? <img src={imageUrl(it.product.image, 200)} alt="" className="h-full w-full object-cover" /> : null}
              <span className="absolute -right-[8px] -top-[8px] flex h-[20px] min-w-[20px] items-center justify-center rounded-full bg-ink px-[5px] text-[11px] text-paper">
                {it.quantity}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="break-words font-medium leading-snug">{it.product?.productName}</p>
              {it.size && <p className="text-[12px] text-taupe">{it.size}</p>}
            </div>
            <span className="shrink-0 whitespace-nowrap tabular-nums">{money(Number(it.product?.price ?? 0) * Number(it.quantity ?? 0))}</span>
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
