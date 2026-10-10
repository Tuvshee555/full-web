/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { usePaymentPending } from "./components/usePaymentPending";
import { OrderStatusShell } from "@/components/store/order/OrderStatusShell";
import { useStoreT } from "@/components/store/lib/useStoreT";

export default function PaymentPendingInner() {
  const { st, locale } = useStoreT();
  const { t, orderId, order, qrText, paid, status, retryCreateInvoice } = usePaymentPending() as any;

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

  const creating = !qrText && status === t("payment_creating");

  return (
    <OrderStatusShell order={order}>
      {order?.orderNumber && <span className="eyebrow">{st("order_n", { n: order.orderNumber })}</span>}

      {paid ? (
        <div className="mt-[14px]">
          <div className="flex h-[56px] w-[56px] items-center justify-center rounded-full bg-ink text-paper">
            <Check className="h-[24px] w-[24px]" strokeWidth={1.6} />
          </div>
          <h1 className="store-heading mt-[22px] text-[48px] md:text-[60px]">{st("paid_title")}</h1>
          <p className="mt-[10px] text-[16px] text-ink/70">{st("paid_text")}</p>
        </div>
      ) : (
        <>
          <h1 className="store-heading mt-[12px] text-[44px] md:text-[56px]">{t("payment_waiting_title")}</h1>
          <p className="mt-[10px] text-[15px] text-ink/70">{t("payment_waiting_subtitle")}</p>

          <section className="mt-[32px] border border-ink/10 bg-white/60 p-[24px] md:p-[32px]">
            <div className="flex flex-col items-center gap-[28px] md:flex-row md:items-start">
              <div className="flex h-[236px] w-[236px] shrink-0 items-center justify-center bg-white p-[14px] ring-1 ring-ink/10">
                {qrText ? (
                  <QRCodeCanvas value={qrText} size={208} fgColor="#1c1714" />
                ) : creating ? (
                  <Loader2 className="h-[28px] w-[28px] animate-spin text-ink/40" strokeWidth={1.2} />
                ) : (
                  <div className="px-[10px] text-center text-[13px] text-ink/70">
                    {st("qr_failed")}
                    <button type="button" onClick={retryCreateInvoice} className="link-underline mt-[10px] block w-full text-ink">
                      {st("retry")}
                    </button>
                  </div>
                )}
              </div>

              <div className="w-full">
                <p className="eyebrow">{st("how_to_pay")}</p>
                <ol className="mt-[14px] space-y-[12px]">
                  {[st("qpay_step1"), st("qpay_step2"), st("qpay_step3")].map((s, i) => (
                    <li key={i} className="flex gap-[14px] text-[15px]">
                      <span className="display-italic w-[22px] shrink-0 text-[22px] leading-none text-ink/35">{i + 1}</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
                {qrText && (
                  <a
                    href={`https://qpay.mn/q?q=${encodeURIComponent(qrText)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn group mt-[24px] w-full md:w-auto"
                  >
                    {st("open_bank_app")}
                    <span className="btn-arrow">
                      <ArrowRight className="h-[16px] w-[16px]" strokeWidth={1.3} />
                    </span>
                  </a>
                )}
              </div>
            </div>

            <div className="mt-[26px] flex items-center gap-[10px] border-t border-ink/10 pt-[18px] text-[13px] text-ink/70">
              <span className="relative flex h-[8px] w-[8px]">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-terracotta/60" />
                <span className="relative inline-flex h-[8px] w-[8px] rounded-full bg-terracotta" />
              </span>
              {st("auto_check")}
            </div>
          </section>

          <p className="mt-[16px] text-[13px] text-taupe">{st("expire_note")}</p>
        </>
      )}
    </OrderStatusShell>
  );
}
