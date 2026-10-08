"use client";

import { MapPin } from "lucide-react";
import { OrderDetails } from "../[orderId]/components/types";
import { useI18n } from "@/components/i18n/ClientI18nProvider";

export function DeliveryInfo({ order }: { order: OrderDetails }) {
  const { t } = useI18n();
  const d = order.delivery;

  const fields = [
    { label: t("name"), value: `${d.lastName ?? ""} ${d.firstName ?? ""}`.trim() },
    { label: t("phone"), value: d.phone },
    { label: t("city"), value: d.city },
    { label: t("district"), value: d.district },
    { label: t("khoroo"), value: d.khoroo },
    { label: t("address"), value: d.address },
    ...(d.notes ? [{ label: t("notes"), value: d.notes }] : []),
  ];

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <h3 className="font-semibold mb-5 flex items-center gap-2">
        <MapPin className="w-4 h-4 text-primary" />
        {t("delivery_information")}
      </h3>
      <div className="grid grid-cols-2 gap-x-8 gap-y-4">
        {fields.map((field, i) => (
          <div key={i} className={field.label === t("address") || field.label === t("notes") ? "col-span-2" : ""}>
            <p className="text-xs text-muted-foreground mb-0.5 uppercase tracking-wide">{field.label}</p>
            <p className="text-sm font-medium">{field.value || "—"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
