"use client";

import { useEffect, useRef, useState } from "react";
import { PaymentPanel } from "@/components/store/order/PaymentPanel";
import { PaymentReviewNotice } from "@/components/store/order/PaymentReviewNotice";
import { Loader2 } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { useStoreT } from "@/components/store/lib/useStoreT";
import { money } from "@/components/store/lib/product";

const PAYMENT_WINDOW_MS = 15 * 60 * 1000;
type OrderLike = {
  status?: string | null;
  createdAt?: string | number | Date;
  totalPrice?: number | null;
  payment?: { status?: string | null; invoiceId?: string | null; qrImage?: string | null; qrText?: string | null; amount?: number | null } | null;
};

/** Payment controls disappear as soon as the reservation can no longer be used. */
export function QPayPaymentBlock({ order, onRefresh }: { order: OrderLike; onRefresh?: () => void }) {
  const { st } = useStoreT();
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(false);
  const [expiredInvoice, setExpiredInvoice] = useState<string | null>(null);
  const [cancelledInvoice, setCancelledInvoice] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ invoiceId: string; requiresReview: boolean } | null>(null);
  const checkRef = useRef<() => Promise<void>>(async () => {});

  const invoiceId = order.payment?.invoiceId ?? null;
  const qrText = order.payment?.qrText ?? null;
  const deadline = order.createdAt ? new Date(order.createdAt).getTime() + PAYMENT_WINDOW_MS : NaN;
  const expired = Boolean(invoiceId) && (expiredInvoice === invoiceId || (Number.isFinite(deadline) && deadline <= Date.now()));
  const cancelled = order.status === "CANCELLED" || (Boolean(invoiceId) && cancelledInvoice === invoiceId);
  const currentReceipt = receipt?.invoiceId === invoiceId ? receipt : null;
  const waiting = order.status === "WAITING_PAYMENT" && Boolean(qrText || order.payment?.qrImage);

  useEffect(() => {
    if (!invoiceId || order.status !== "WAITING_PAYMENT" || !Number.isFinite(deadline)) return;
    const timer = window.setTimeout(() => {
      setExpiredInvoice(invoiceId);
      onRefresh?.();
    }, Math.max(0, deadline - Date.now()));
    return () => window.clearTimeout(timer);
  }, [invoiceId, order.status, deadline, onRefresh]);

  // Each invoice owns its request, overlap flag and stopped state. Cleanup
  // aborts requests so a previous order can never refresh or stop a new one.
  useEffect(() => {
    if (!invoiceId || !["WAITING_PAYMENT", "CANCELLED"].includes(order.status ?? "") ||
        (order.status === "CANCELLED" && order.payment?.status === "PAID")) return;
    let active = true;
    let inFlight = false;
    let stopped = false;
    let observedCancellation = order.status === "CANCELLED";
    let activeRequest: AbortController | null = null;
    setChecking(false);
    setError(false);

    const check = async () => {
      if (!active || stopped || inFlight || document.hidden) return;
      inFlight = true;
      const controller = new AbortController();
      activeRequest = controller;
      const timeout = window.setTimeout(() => controller.abort(new DOMException("Payment check timed out", "TimeoutError")), 25_000);
      setChecking(true);
      setError(false);
      try {
        const res = await fetch(`${API_BASE_URL}/qpay/check`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` },
          body: JSON.stringify({ invoiceId }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("PAYMENT_CHECK_FAILED");
        const data = await res.json();
        if (!active || controller.signal.aborted) return;
        if (data?.paid) {
          stopped = true;
          setReceipt({ invoiceId, requiresReview: Boolean(data.requiresReview) });
          onRefresh?.();
        } else if (data?.orderStatus === "CANCELLED" && !observedCancellation) {
          observedCancellation = true;
          setCancelledInvoice(invoiceId);
          onRefresh?.();
        }
      } catch {
        if (active) setError(true);
      } finally {
        window.clearTimeout(timeout);
        activeRequest = null;
        inFlight = false;
        if (active) setChecking(false);
      }
    };
    checkRef.current = check;
    void check();
    const interval = window.setInterval(() => { void check(); }, 30_000);
    const onVisible = () => { if (!document.hidden) void check(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      activeRequest?.abort();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      if (checkRef.current === check) checkRef.current = async () => {};
    };
  }, [invoiceId, order.status, order.payment?.status, onRefresh]);

  if ((cancelled && order.payment?.status === "PAID") || currentReceipt?.requiresReview) return <PaymentReviewNotice />;
  if (currentReceipt || (waiting && order.payment?.status === "PAID")) return <p role="status" className="text-[15px] text-ink">{st("payment_received")}</p>;
  if (cancelled || !waiting) return null;

  const checkButton = (
    <button type="button" onClick={() => { void checkRef.current(); }} disabled={checking} className="btn-secondary mt-[20px] w-full sm:w-auto">
      {checking && <Loader2 className="h-[15px] w-[15px] animate-spin" aria-hidden />}{st("check_payment")}
    </button>
  );
  if (expired) return (
    <section role="status" className="border border-ink/15 bg-sand/60 p-[20px]">
      <h2 className="store-heading text-[28px]">{st("time_up")}</h2>
      <p className="mt-[8px] text-[14px] leading-relaxed text-ink/70">{st("time_up_sub")}</p>
      {checkButton}
    </section>
  );

  return (
    <section>
      <div className="mb-[20px] flex flex-wrap items-baseline justify-between gap-[12px]">
        <h2 className="store-heading text-[30px]">{st("pay_now_title")}</h2>
        <p className="text-[24px] font-medium text-ink tabular-nums">{money(order.totalPrice ?? order.payment?.amount ?? 0)}</p>
      </div>
      {qrText ? <PaymentPanel qrText={qrText} /> : (
        <div className="mx-auto w-[232px] max-w-full border border-ink/15 bg-white p-[16px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`data:image/png;base64,${order.payment?.qrImage}`} alt={st("qpay_qr_label")} className="h-auto w-full" />
        </div>
      )}
      {checkButton}
      <p className="mt-[14px] text-[13px] text-taupe">{st("expire_note")}</p>
      {error && <p role="alert" className="mt-[12px] text-[14px] text-terracotta">{st("payment_check_error")}</p>}
    </section>
  );
}
