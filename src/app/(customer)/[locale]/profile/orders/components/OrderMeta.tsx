"use client";

import { useI18n } from "@/components/i18n/ClientI18nProvider";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { OrderDetails } from "../[orderId]/components/types";

export function OrderMeta({ order }: { order: OrderDetails }) {
  const { t } = useI18n();

  const fields = [
    { label: t("order_number"), value: `#${order.orderNumber}`, mono: true },
    { label: t("status"), value: <OrderStatusBadge status={order.status} /> },
    {
      label: t("payment_method"),
      value: order.paymentMethod
        ? t(`payment_method_${String(order.paymentMethod).toLowerCase()}`)
        : "—",
    },
    { label: t("created_at"), value: new Date(order.createdAt).toLocaleString() },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {fields.map((item, i) => (
          <div key={i}>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              {item.label}
            </p>
            <div className={`font-semibold text-sm ${item.mono ? "font-mono" : ""}`}>
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
