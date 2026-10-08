"use client";

import { useI18n } from "@/components/i18n/ClientI18nProvider";
import { OrderDetails } from "../[orderId]/components/types";

export function OrderCostSummary({ order }: { order: OrderDetails }) {
  const { t } = useI18n();

  const itemsTotal = order.items.reduce((sum, item) => {
    return sum + (item.food.price ?? 0) * item.quantity;
  }, 0);

  const deliveryFee = typeof order.deliveryFee === "number" ? order.deliveryFee : 0;
  const grandTotal = typeof order.totalPrice === "number" ? order.totalPrice : itemsTotal + deliveryFee;

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <h3 className="font-semibold mb-5">{t("payment_summary")}</h3>
      <div className="space-y-2.5">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("products_total")}</span>
          <span>{itemsTotal.toLocaleString()}₮</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("delivery_fee")}</span>
          <span>{deliveryFee.toLocaleString()}₮</span>
        </div>
        <div className="flex justify-between font-bold text-base pt-3 border-t border-border mt-1">
          <span>{t("total")}</span>
          <span className="text-primary">{grandTotal.toLocaleString()}₮</span>
        </div>
      </div>
    </div>
  );
}
