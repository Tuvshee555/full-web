"use client";

import { CircleAlert } from "lucide-react";
import { STORE } from "@/config/store";
import { useStoreT } from "../lib/useStoreT";

export function PaymentReviewNotice() {
  const { st } = useStoreT();
  return (
    <div role="status" className="border border-terracotta/30 bg-sand p-[20px] text-ink">
      <CircleAlert className="mb-[12px] h-[24px] w-[24px] text-terracotta" aria-hidden />
      <h2 className="text-[18px] font-medium">{st("payment_review_title")}</h2>
      <p className="mt-[8px] text-[14px] leading-relaxed">{st("payment_review_body")}</p>
      {STORE.contact.phone && <a href={`tel:${STORE.contact.phone}`} className="mt-[12px] inline-flex min-h-[44px] items-center font-medium underline underline-offset-4">{STORE.contact.phone}</a>}
    </div>
  );
}
