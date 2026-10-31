"use client";

import { useI18n } from "@/components/i18n/ClientI18nProvider";

// Brand palette, not traffic-light colours: a dot + label.
const DOT: Record<string, string> = {
  PENDING: "bg-taupe",
  WAITING_PAYMENT: "bg-terracotta",
  COD_PENDING: "bg-taupe",
  PAID: "bg-ink",
  DELIVERING: "bg-ink",
  DELIVERED: "bg-[#5b6b4b]",
  CANCELLED: "bg-ink/25",
};

export function OrderStatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  return (
    <span className={`inline-flex items-center gap-[8px] text-[13px] ${status === "CANCELLED" ? "text-ink/60" : "text-ink"}`}>
      <span aria-hidden className={`inline-flex h-[8px] w-[8px] shrink-0 ${DOT[status] ?? "bg-taupe"}`} />
      {t(`order_status_${status.toLowerCase()}`)}
    </span>
  );
}
