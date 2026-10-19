"use client";

import { ArrowUpRight, Loader2, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useStoreT } from "../lib/useStoreT";

/** Adapts to the payment column itself, including narrow desktop layouts. */
export function PaymentPanel({ qrText, creating, onRetry }: { qrText: string | null; creating?: boolean; onRetry?: () => void }) {
  const { st } = useStoreT();

  return (
    <div className="payment-panel border border-ink/15 bg-white/60 p-[20px] sm:p-[24px]">
      <div className="flex items-center justify-between gap-[16px]">
        <h2 className="text-[17px] font-medium text-ink">QPay</h2>
        <QrCode className="h-[20px] w-[20px] text-taupe" strokeWidth={1.5} aria-hidden />
      </div>
      <p className="mt-[6px] text-[14px] text-taupe">{st("payment_intro")}</p>
      {qrText && (
        <a href={`https://qpay.mn/q?q=${encodeURIComponent(qrText)}`} target="_blank" rel="noopener noreferrer" className="btn mt-[20px] w-full justify-between !px-[20px]">
          {st("open_bank_app")}
          <ArrowUpRight className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} aria-hidden />
        </a>
      )}
      <div className="my-[22px] flex items-center gap-[14px] text-[12px] text-taupe">
        <span className="h-px flex-1 bg-ink/10" />
        <span>{st("scan_qr_alternative")}</span>
        <span className="h-px flex-1 bg-ink/10" />
      </div>
      <div className="payment-options">
        <div className="payment-qr">
          <div className="flex aspect-square items-center justify-center border border-ink/15 bg-white p-[16px]">
            {qrText ? (
              <QRCodeSVG value={qrText} size={200} marginSize={0} fgColor="#1c1714" aria-label={st("qpay_qr_label")} role="img" />
            ) : creating ? (
              <div role="status" className="flex flex-col items-center gap-[12px] text-[14px] text-taupe">
                <Loader2 className="h-[24px] w-[24px] animate-spin" aria-hidden />
                {st("preparing_payment")}
              </div>
            ) : (
              <div role="alert" className="text-center text-[14px] text-taupe">
                <p>{st("qr_failed")}</p>
                {onRetry && <button type="button" onClick={onRetry} className="mt-[8px] min-h-[44px] px-[12px] font-medium text-ink underline underline-offset-4">{st("retry")}</button>}
              </div>
            )}
          </div>
          <p className="mt-[12px] text-center text-[13px] leading-relaxed text-taupe">{st("scan_other")}</p>
        </div>
        <div className="payment-steps">
          <h3 className="text-[14px] font-medium text-ink">{st("how_to_pay")}</h3>
          <ol className="mt-[16px] space-y-[16px]">
            {[st("qpay_step1"), st("qpay_step2"), st("qpay_step3")].map((step, index) => (
              <li key={step} className="flex gap-[12px] text-[14px] leading-relaxed">
                <span className="flex h-[24px] w-[24px] shrink-0 items-center justify-center bg-sand text-[12px] text-ink">{index + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
