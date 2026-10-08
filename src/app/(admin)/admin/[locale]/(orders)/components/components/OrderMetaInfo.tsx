/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Copy } from "lucide-react";

type Props = {
  order: any;
  t: (key: string) => string;
  copy: (value: string) => void;
};

export function OrderMetaInfo({ order, t, copy }: Props) {
  const Item = ({
    label,
    children,
    action,
  }: {
    label: string;
    children: React.ReactNode;
    action?: React.ReactNode;
  }) => (
    <div className="flex justify-between gap-6 py-3">
      <div className="text-sm font-medium text-foreground whitespace-nowrap">
        {label}
      </div>
      <div className="flex items-center gap-2 text-sm text-foreground text-right">
        {children}
        {action}
      </div>
    </div>
  );

  return (
    <div className="bg-card border border-border rounded-lg px-5 py-4">
      <div className="text-sm font-semibold mb-4 text-foreground">
        {t("order")}
      </div>

      <div className="divide-y divide-border">
        <Item label={t("order_id")}>{order?.id ?? "-"}</Item>

        {order?.orderNumber && (
          <Item
            label={t("order_number")}
            action={
              <button
                onClick={() => copy(order.orderNumber)}
                className="inline-flex items-center gap-1 text-xs font-medium text-foreground"
              >
                <Copy className="w-3 h-3" />
                {t("copy")}
              </button>
            }
          >
            #{order.orderNumber}
          </Item>
        )}

        <Item label={t("created_at")}>
          {order?.createdAt ? new Date(order.createdAt).toLocaleString() : "-"}
        </Item>

        <Item label={t("payment_method")}>
          {order?.paymentMethod === "LEMON"
            ? "Card (Visa/Mastercard)"
            : order?.paymentMethod ?? "-"}
        </Item>

        <Item label={t("payment_status")}>
          {order?.status === "PAID" ? (
            <span className="px-2 py-1 rounded-md text-xs font-semibold bg-green-500/15 text-green-600">
              PAID
            </span>
          ) : (
            <span className="px-2 py-1 rounded-md text-xs font-semibold bg-orange-500/15 text-orange-600">
              {order?.status ?? "-"}
            </span>
          )}
        </Item>
      </div>
    </div>
  );
}
