"use client";

import { useI18n } from "@/components/i18n/ClientI18nProvider";
import clsx from "clsx";

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  WAITING_PAYMENT: "bg-orange-100 text-orange-700",
  COD_PENDING: "bg-blue-100 text-blue-700",
  PAID: "bg-green-100 text-green-700",
  DELIVERING: "bg-indigo-100 text-indigo-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export function OrderStatusBadge({ status }: { status: string }) {
  const { t } = useI18n();

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        STATUS_STYLE[status]
      )}
    >
      {t(`order_status_${status.toLowerCase()}`)}
    </span>
  );
}
