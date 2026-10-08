"use client";

import { FileText } from "lucide-react";
import { Button } from "@admin/components/ui/button";
import { OrderItems } from "./components/OrderItems";
import { RawOrder } from "./type";
import { normalizeDelivery } from "@admin/utils/normalizeDelivery";
import { DeliveryInfo } from "./components/DeliveryInfo";
import { OrderMetaInfo } from "./components/OrderMetaInfo";

type Props = {
  order: RawOrder;
  expanded: boolean;
  items: RawOrder["items"] | RawOrder["foodOrderItems"];
  t: (key: string) => string;
  copy: (value: string) => void;
};

export function OrderExpandedDetails({
  order,
  expanded,
  items,
  t,
  copy,
}: Props) {
  if (!expanded) return null;

  const delivery = normalizeDelivery(order);

  return (
    <div className="border-t border-border px-5 py-4">
      <div className="flex flex-col gap-6">
        {/* Items */}
        <OrderItems items={items} orderId={order.id} t={t} />

        {/* Meta */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
          <DeliveryInfo delivery={delivery} t={t} copy={copy} />
          <OrderMetaInfo order={order} t={t} copy={copy} />
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 md:flex-row">
          <Button
            variant="outline"
            className="md:flex-1"
            onClick={() => window.open(`/admin/orders/${order.id}`, "_blank")}
          >
            <FileText className="w-4 h-4 mr-2" />
            {t("view_details")}
          </Button>

          <Button
            className="md:flex-1"
            onClick={() => {
              const summary = `Order ${order.orderNumber ?? order.id} - ₮${(
                order.totalPrice ?? 0
              ).toLocaleString()}`;
              copy(summary);
            }}
          >
            {t("copy_summary")}
          </Button>
        </div>
      </div>
    </div>
  );
}
