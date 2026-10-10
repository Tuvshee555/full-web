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
  const live = status === "WAITING_PAYMENT" || status === "DELIVERING";
  return (
    <span className={`inline-flex items-center gap-[8px] text-[13px] ${status === "CANCELLED" ? "text-ink/45" : "text-ink"}`}>
      <span className="relative flex h-[7px] w-[7px]">
        {live && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${DOT[status]}`} />}
        <span className={`relative inline-flex h-[7px] w-[7px] rounded-full ${DOT[status] ?? "bg-taupe"}`} />
      </span>
      {t(`order_status_${status.toLowerCase()}`)}
    </span>
  );
}
