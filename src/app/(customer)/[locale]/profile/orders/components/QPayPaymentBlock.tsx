/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/rules-of-hooks */
"use client";

import { API_BASE_URL } from "@/lib/api";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import { ClipboardCopyIcon, ExternalLink, Loader2 } from "lucide-react";

type MinimalPayment = {
  invoiceId?: string | null;
  qrImage?: string | null;
  qrText?: string | null;
  status?: "PENDING" | "PAID" | string | null;
  amount?: number | null;
};

type OrderLike = {
  status?: string | null;
  totalPrice?: number | null;
  payment?: MinimalPayment | null;
};

function safeImageSrc(src?: string | null) {
  if (!src) return null;
  if (src.startsWith("http")) return src;
  if (src.startsWith("/")) return src;
  if (src.startsWith("data:image")) return src;
  return `data:image/png;base64,${src}`;
}

export function QPayPaymentBlock({
  order,
  onRefresh,
}: {
  order: OrderLike;
  onRefresh?: () => void;
}) {
  const { t } = useI18n();
  const [checking, setChecking] = useState(false);
  const stoppedRef = useRef(false);

  const invoiceId = order.payment?.invoiceId ?? null;
  const qrText = order.payment?.qrText ?? null;
  const amount = order.totalPrice ?? order.payment?.amount ?? 0;
  const imgSrc = safeImageSrc(order.payment?.qrImage);

  // don’t show unless waiting payment
  if (order?.status !== "WAITING_PAYMENT") return null;
  if (!order.payment?.qrImage && !order.payment?.qrText) return null;

  const handleCopyInvoice = async () => {
    if (!invoiceId) return;
    try {
      await navigator.clipboard.writeText(invoiceId);
    } catch {}
  };

  const checkPayment = async () => {
    if (!invoiceId) return;

    setChecking(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/qpay/check`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invoiceId }),
        }
      );

      const data = await res.json();

      if (data?.paid) {
        stoppedRef.current = true; // stop polling
        onRefresh?.(); // refresh order -> will become PAID
      }
    } catch (err) {
      // ignore network error
    } finally {
      setChecking(false);
    }
  };

  // ✅ AUTO POLL
  useEffect(() => {
    if (!invoiceId) return;

    stoppedRef.current = false;

    // instant check once
    checkPayment();

    const interval = setInterval(() => {
      if (stoppedRef.current) return;
      checkPayment();
    }, 300000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4 text-center">
      <h3 className="text-sm font-semibold">{t("complete_payment")}</h3>

      <p className="text-xs text-muted-foreground">{t("scan_qpay_qr")}</p>

      {/* QR IMAGE */}
      <div className="mx-auto relative w-48 h-48">
        {imgSrc ? (
          <Image
            src={imgSrc}
            alt="QPay QR"
            fill
            sizes="192px"
            className="object-contain"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
            {t("no_qr_available")}
          </div>
        )}
      </div>

      {/* AMOUNT */}
      <div className="text-sm font-medium">
        {t("amount")}: {amount.toLocaleString()}₮
      </div>

      {/* INVOICE */}
      {invoiceId && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span>
            {t("invoice")}: {invoiceId}
          </span>
          <button
            onClick={handleCopyInvoice}
            aria-label="Copy invoice id"
            className="hover:text-foreground"
            type="button"
          >
            <ClipboardCopyIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">{t("open_bank_app")}</p>

      {/* ACTIONS */}
      <div className="flex flex-col sm:flex-row justify-center gap-3 mt-2">
        {/* Pay with app */}
        {qrText && (
          <a
            href={`https://qpay.mn/q?q=${encodeURIComponent(qrText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="h-10 px-4 rounded-lg bg-primary text-primary-foreground flex items-center justify-center gap-2 text-sm"
          >
            <ExternalLink className="w-4 h-4" />
            {t("pay_with_qpay")}
          </a>
        )}

        {/* Check payment */}
        <button
          onClick={checkPayment}
          className="h-10 px-4 rounded-lg border text-sm text-primary flex items-center justify-center gap-2"
          type="button"
          disabled={checking}
        >
          {checking && <Loader2 className="w-4 h-4 animate-spin" />}
          {t("check_payment")}
        </button>
      </div>

      <p className="text-xs text-muted-foreground mt-2">
        {t("payment_waiting_note")}
      </p>
    </div>
  );
}
