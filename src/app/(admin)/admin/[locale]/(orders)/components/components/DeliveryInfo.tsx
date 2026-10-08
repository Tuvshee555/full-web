/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Copy } from "lucide-react";

type Props = {
  delivery?: any;
  t: (key: string) => string;
  copy: (value: string) => void;
};

export function DeliveryInfo({ delivery, t, copy }: Props) {
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
        {t("delivery")}
      </div>

      <div className="divide-y divide-border">
        <Item label={t("name")}>
          {delivery?.firstName ?? ""} {delivery?.lastName ?? ""}
        </Item>

        <Item
          label={t("phone")}
          action={
            delivery?.phone && (
              <button
                onClick={() => copy(delivery.phone)}
                className="inline-flex items-center gap-1 text-xs font-medium text-foreground"
              >
                <Copy className="w-3 h-3" />
                {t("copy")}
              </button>
            )
          }
        >
          {delivery?.phone ?? "-"}
        </Item>

        <Item label={t("city")}>{delivery?.city ?? "-"}</Item>
        <Item label={t("district")}>{delivery?.district ?? "-"}</Item>
        <Item label={t("khoroo")}>{delivery?.khoroo ?? "-"}</Item>

        <Item label={t("address")}>{delivery?.address ?? "-"}</Item>

        {delivery?.notes && <Item label={t("notes")}>{delivery.notes}</Item>}
      </div>
    </div>
  );
}
