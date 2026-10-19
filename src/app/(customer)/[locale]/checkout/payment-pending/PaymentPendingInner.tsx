/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Check, Clock, Loader2 } from "lucide-react";
import { usePaymentPending } from "./components/usePaymentPending";
import { PaymentPanel } from "@/components/store/order/PaymentPanel";
import { PaymentReviewNotice } from "@/components/store/order/PaymentReviewNotice";
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
  const { t, orderId, resolvedOrderId, order, qrText, paid, requiresReview, status, loadingOrder, retryCreateInvoice } = usePaymentPending() as any;
  const left = useCountdown(order?.createdAt);

  if (!resolvedOrderId || (loadingOrder && !order)) {
    return <OrderStatusShell><div role="status" aria-label={st("preparing_payment")} className="space-y-[20px] animate-pulse"><div className="h-[40px] w-3/4 bg-sand" /><div className="h-[100px] bg-sand" /><div className="h-[360px] bg-sand" /></div></OrderStatusShell>;
  }

  if (!orderId || !order) {
    return (
      <OrderStatusShell>
        <h1 className="store-heading page-title">{st("order_not_found")}</h1>
        <p className="mt-[16px] text-taupe">{t("order_invalid_url")}</p>
        {orderId && <button type="button" onClick={retryCreateInvoice} className="btn mt-[24px]">{st("retry")}</button>}
      </OrderStatusShell>
    );
  }

  const eyebrow = order?.orderNumber && <span className="eyebrow">{st("order_n", { n: order.orderNumber })}</span>;
  const expired = order?.status === "CANCELLED" || (!paid && left === 0);
  if (requiresReview) return <OrderStatusShell order={order}>{eyebrow}<h1 className="store-heading page-title mb-[24px] mt-[10px]">{st("payment_received")}</h1><PaymentReviewNotice /></OrderStatusShell>;

  /* ---------- Paid: thank-you ---------- */
  if (paid) {
    return (
      <OrderStatusShell order={order}>
        <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-ink text-paper animate-in zoom-in-50 duration-700">
          <Check className="h-[26px] w-[26px]" strokeWidth={1.5} />
        </div>
        <div className="mt-[24px]">{eyebrow}</div>
        <h1 className="store-heading page-title mt-[10px]">{st("thanks_title")}</h1>
        <p className="mt-[10px] text-[16px] text-ink/70">{st("thanks_sub")}</p>

        <p className="eyebrow mt-[40px]">{st("next_title")}</p>
        <ol className="mt-[12px] border-t border-ink/10">
          {[st("next_1"), st("next_2"), st("next_3")].map((s, i) => (
            <li key={i} className="flex items-baseline gap-[18px] border-b border-ink/10 py-[16px] text-[15px]">
              <span className="store-heading w-[18px] shrink-0 text-[22px] text-ink/55">{i + 1}</span>
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
        <h1 className="store-heading page-title mt-[10px]">{st("time_up")}</h1>
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
  return (
    <OrderStatusShell order={order}>
      {eyebrow}
      <h1 className="store-heading mt-[10px] text-[36px] sm:text-[44px]">{st("pay_now_title")}</h1>
      <div className="mb-[24px] mt-[24px] flex flex-wrap items-center justify-between gap-[16px] border-y border-ink/15 py-[20px]">
        <div>
          <p className="text-[13px] text-taupe">{st("amount_due")}</p>
          <p className="mt-[4px] text-[32px] font-medium leading-tight tracking-tight tabular-nums">{order ? money(order.totalPrice) : "…"}</p>
        </div>
        {mmss && (
          <p className={`flex items-center gap-[8px] bg-sand px-[12px] py-[8px] text-[12px] tabular-nums ${left !== null && left < 120 ? "text-terracotta" : "text-ink"}`}>
            <Clock className="h-[15px] w-[15px] shrink-0" strokeWidth={1.5} aria-hidden />
            {st("time_left", { t: mmss })}
          </p>
        )}
      </div>
      <PaymentPanel qrText={qrText} creating={creating} onRetry={retryCreateInvoice} />
      {qrText && (
        <div role="status" className="mt-[20px] flex items-start gap-[12px] bg-sand/60 p-[16px] text-[13px] leading-relaxed text-taupe">
          <Loader2 className="mt-[3px] h-[16px] w-[16px] shrink-0 animate-spin" strokeWidth={1.5} aria-hidden />
          <p><span className="block font-medium text-ink">{st("waiting_status")}</span>{st("auto_check")}</p>
        </div>
      )}
    </OrderStatusShell>
  );
}
