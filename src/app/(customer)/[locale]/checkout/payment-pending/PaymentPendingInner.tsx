/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { ArrowRight, Check, Clock, Loader2 } from "lucide-react";
import { usePaymentPending } from "./components/usePaymentPending";
import { OrderStatusShell } from "@/components/store/order/OrderStatusShell";
import { useStoreT } from "@/components/store/lib/useStoreT";
import { collectionUrl, money } from "@/components/store/lib/product";

const PAY_WINDOW_MS = 15 * 60 * 1000; // server cancels unpaid QPay orders after 15 min

/** Seconds left in the QPay window, ticking every second. */
function useCountdown(createdAt?: string | number | Date) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!createdAt) return;
    const deadline = new Date(createdAt).getTime() + PAY_WINDOW_MS;
    const tick = () => setLeft(Math.max(0, Math.floor((deadline - Date.now()) / 1000)));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [createdAt]);
  return left;
}

export default function PaymentPendingInner() {
  const { st, locale } = useStoreT();
  const { t, orderId, order, qrText, paid, status, retryCreateInvoice } = usePaymentPending() as any;
  const left = useCountdown(order?.createdAt);

  if (!orderId) {
    return (
      <OrderStatusShell>
        <p className="text-ink/70">{t("order_invalid_url")}</p>
        <Link href={`/${locale}`} className="link-underline mt-[16px] inline-block text-ink">
          {st("back_to_store")}
        </Link>
      </OrderStatusShell>
    );
  }

  const eyebrow = order?.orderNumber && <span className="eyebrow">{st("order_n", { n: order.orderNumber })}</span>;
  const expired = order?.status === "CANCELLED" || (!paid && left === 0);

  /* ---------- Paid: thank-you ---------- */
  if (paid) {
    return (
      <OrderStatusShell order={order}>
        <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-ink text-paper animate-in zoom-in-50 duration-700">
          <Check className="h-[26px] w-[26px]" strokeWidth={1.5} />
        </div>
        <div className="mt-[24px]">{eyebrow}</div>
        <h1 className="store-heading mt-[10px] text-[56px] md:text-[72px]">{st("thanks_title")}</h1>
        <p className="mt-[10px] text-[16px] text-ink/70">{st("thanks_sub")}</p>

        <p className="eyebrow mt-[40px]">{st("next_title")}</p>
        <ol className="mt-[12px] border-t border-ink/10">
          {[st("next_1"), st("next_2"), st("next_3")].map((s, i) => (
            <li key={i} className="flex items-baseline gap-[18px] border-b border-ink/10 py-[16px] text-[15px]">
              <span className="store-heading w-[18px] shrink-0 text-[22px] text-ink/40">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>

        <div className="mt-[32px] flex flex-col gap-[16px] sm:flex-row sm:items-center">
          {order?.id && (
            <Link href={`/${locale}/profile/orders/${order.id}`} className="btn group">
              {st("view_order")}
              <span className="btn-arrow">
                <ArrowRight className="h-[16px] w-[16px]" strokeWidth={1.3} />
              </span>
            </Link>
          )}
          <Link href={collectionUrl(locale)} className="link-underline text-[14px] text-ink sm:ml-[12px]">
            {st("shop_again")}
          </Link>
        </div>
      </OrderStatusShell>
    );
  }

  /* ---------- Time up / cancelled ---------- */
  if (expired) {
    return (
      <OrderStatusShell order={order}>
        {eyebrow}
        <h1 className="store-heading mt-[10px] text-[48px] md:text-[60px]">{st("time_up")}</h1>
        <p className="mt-[10px] max-w-[460px] text-[16px] text-ink/70">{st("time_up_sub")}</p>
        <Link href={collectionUrl(locale)} className="btn group mt-[32px]">
          {st("shop_again")}
          <span className="btn-arrow">
            <ArrowRight className="h-[16px] w-[16px]" strokeWidth={1.3} />
          </span>
        </Link>
      </OrderStatusShell>
    );
  }

  /* ---------- Waiting for payment ---------- */
  const creating = !qrText && status === t("payment_creating");
  const mmss = left === null ? "" : `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;
  const deepLink = qrText ? `https://qpay.mn/q?q=${encodeURIComponent(qrText)}` : null;
  const openApp = deepLink && (
    <a href={deepLink} target="_blank" rel="noopener noreferrer" className="btn group w-full sm:w-auto">
      {st("open_bank_app")}
      <span className="btn-arrow">
        <ArrowRight className="h-[16px] w-[16px]" strokeWidth={1.3} />
      </span>
    </a>
  );

  return (
    <OrderStatusShell order={order}>
      {eyebrow}
      <h1 className="store-heading mt-[10px] text-[44px] md:text-[56px]">{st("pay_now_title")}</h1>

      {/* Amount + countdown: what a payer looks for first */}
      <div className="mt-[28px] flex flex-wrap items-end justify-between gap-[12px] border-y border-ink/10 py-[20px]">
        <div>
          <p className="eyebrow">{st("amount_due")}</p>
          <p className="store-heading mt-[6px] text-[48px] leading-none">{order ? money(order.totalPrice) : "…"}</p>
        </div>
        {mmss && (
          <p className="flex items-center gap-[8px] text-[14px] text-ink/70">
            <Clock className="h-[15px] w-[15px]" strokeWidth={1.3} />
            {st("time_left", { t: mmss })}
          </p>
        )}
      </div>

      {/* Phones can't scan their own screen: app button first */}
      <div className="mt-[24px] sm:hidden">{openApp}</div>

      <div className="mt-[28px] grid items-start gap-[28px] sm:grid-cols-[auto_1fr]">
        <div>
          <div className="flex h-[232px] w-[232px] items-center justify-center bg-white p-[14px] shadow-[0_24px_50px_-30px_rgba(28,23,20,0.35)] ring-1 ring-ink/10">
            {qrText ? (
              <QRCodeCanvas value={qrText} size={204} fgColor="#1c1714" />
            ) : creating ? (
              <Loader2 className="h-[26px] w-[26px] animate-spin text-ink/35" strokeWidth={1.1} />
            ) : (
              <div className="px-[12px] text-center text-[13px] text-ink/70">
                {st("qr_failed")}
                <button type="button" onClick={retryCreateInvoice} className="link-underline mt-[10px] block w-full text-ink">
                  {st("retry")}
                </button>
              </div>
            )}
          </div>
          <p className="mt-[10px] max-w-[232px] text-[12px] text-ink/50 sm:hidden">{st("scan_other")}</p>
        </div>

        <div className="hidden sm:block">
          <p className="eyebrow">{st("how_to_pay")}</p>
          <ol className="mt-[14px] space-y-[14px]">
            {[st("qpay_step1"), st("qpay_step2"), st("qpay_step3")].map((s, i) => (
              <li key={i} className="flex gap-[14px] text-[15px] leading-snug">
                <span className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full text-[12px] ring-1 ring-ink/25">{i + 1}</span>
                <span className="pt-[2px]">{s}</span>
              </li>
            ))}
          </ol>
          <div className="mt-[24px]">{openApp}</div>
        </div>
      </div>

      <p className="mt-[32px] flex items-center gap-[10px] text-[13px] text-ink/60">
        <Loader2 className="h-[14px] w-[14px] animate-spin text-ink/50" strokeWidth={1.4} />
        {st("waiting_status")} {st("auto_check")}
      </p>
    </OrderStatusShell>
  );
}
