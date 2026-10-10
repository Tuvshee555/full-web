"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { ArrowRight, Loader2 } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { useStoreT } from "@/components/store/lib/useStoreT";
import { money } from "@/components/store/lib/product";

type OrderLike = {
  status?: string | null;
  totalPrice?: number | null;
  payment?: { invoiceId?: string | null; qrImage?: string | null; qrText?: string | null; amount?: number | null } | null;
};

/** Shown on an order that is still waiting for its QPay payment. */
export function QPayPaymentBlock({ order, onRefresh }: { order: OrderLike; onRefresh?: () => void }) {
  const { st } = useStoreT();
  const [checking, setChecking] = useState(false);
  const stopped = useRef(false);

  const invoiceId = order.payment?.invoiceId ?? null;
  const qrText = order.payment?.qrText ?? null;
  const waiting = order.status === "WAITING_PAYMENT" && Boolean(qrText || order.payment?.qrImage);

  const check = async () => {
    if (!invoiceId) return;
    setChecking(true);
    try {
      const res = await fetch(`${API_BASE_URL}/qpay/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });
      const data = await res.json();
      if (data?.paid) {
        stopped.current = true;
        onRefresh?.();
      }
    } catch {
      /* network blip: the next poll retries */
    } finally {
      setChecking(false);
    }
  };

  // Hooks run unconditionally (the old version called useEffect after early returns)
  useEffect(() => {
    if (!waiting || !invoiceId) return;
    stopped.current = false;
    check();
    const id = setInterval(() => !stopped.current && check(), 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting, invoiceId]);

  if (!waiting) return null;

  return (
    <section className="border border-ink/10 p-[24px] md:p-[28px]">
      <h2 className="store-heading text-[30px]">{st("pay_now_title")}</h2>
      <div className="mt-[20px] flex flex-col items-center gap-[24px] sm:flex-row sm:items-start">
        <div className="flex h-[200px] w-[200px] shrink-0 items-center justify-center bg-white p-[12px] ring-1 ring-ink/10">
          {qrText ? (
            <QRCodeCanvas value={qrText} size={176} fgColor="#1c1714" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`data:image/png;base64,${order.payment?.qrImage}`} alt="QPay QR" className="h-full w-full object-contain" />
          )}
        </div>
        <div className="w-full">
          <p className="text-[15px] text-ink/70">{st("qpay_step2")}</p>
          <p className="mt-[10px] text-[20px] font-medium">{money(order.totalPrice ?? order.payment?.amount ?? 0)}</p>
          <div className="mt-[18px] flex flex-wrap gap-[10px]">
            {qrText && (
              <a href={`https://qpay.mn/q?q=${encodeURIComponent(qrText)}`} target="_blank" rel="noopener noreferrer" className="btn group">
                {st("open_bank_app")}
                <span className="btn-arrow">
                  <ArrowRight className="h-[16px] w-[16px]" strokeWidth={1.3} />
                </span>
              </a>
            )}
            <button type="button" onClick={check} disabled={checking} className="btn-secondary">
              {checking && <Loader2 className="h-[15px] w-[15px] animate-spin" strokeWidth={1.4} />}
              {st("check_payment")}
            </button>
          </div>
          <p className="mt-[14px] text-[13px] text-taupe">{st("expire_note")}</p>
        </div>
      </div>
    </section>
  );
}
