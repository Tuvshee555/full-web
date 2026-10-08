"use client";

import { API_BASE_URL } from "@/lib/api";
import axios from "axios";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { OrderDetails } from "./types";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import { useAuth } from "@/app/(customer)/[locale]/provider/AuthProvider";

export const Summary = ({
  order,
  onUpdated,
}: {
  order: OrderDetails;
  onUpdated: () => void;
}) => {
  const router = useRouter();
  const { locale, t } = useI18n();
  const { token } = useAuth();

  const canCancel =
    order.status === "PENDING" ||
    order.status === "WAITING_PAYMENT" ||
    order.status === "COD_PENDING";

  const handleCancel = async () => {
    try {
      await axios.patch(
        `${API_BASE_URL}/order/${order.id}`,
        { status: "CANCELLED" },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success(t("order_cancel_success"));
      onUpdated();
    } catch {
      toast.error(t("order_cancel_error"));
    }
  };

  const handleReorder = () => {
    router.push(`/${locale}/food?reorder=${order.id}`);
  };

  const deliveryFee =
    typeof order.deliveryFee === "number" ? order.deliveryFee : 0;
  const itemsTotal =
    typeof order.totalPrice === "number"
      ? Math.max(order.totalPrice - deliveryFee, 0)
      : 0;

  return (
    <div className="bg-card p-5 rounded-xl border border-border">
      <div className="flex justify-between text-sm text-muted-foreground mb-3">
        <span>{t("order_food_total")}</span>
        <span>{itemsTotal.toLocaleString()}₮</span>
      </div>

      <div className="flex justify-between text-sm text-muted-foreground mb-3">
        <span>{t("delivery_fee")}</span>
        <span>{deliveryFee.toLocaleString()}₮</span>
      </div>

      <div className="border-t border-border my-4" />

      <div className="flex justify-between items-center text-lg font-semibold">
        <span>{t("order_total")}</span>
        <span>{order.totalPrice.toLocaleString()}₮</span>
      </div>

      <div className="mt-5 flex gap-3">
        <button
          onClick={handleReorder}
          className="
            flex-1 h-[44px]
            rounded-md
            border border-border
            bg-background
            text-sm font-medium
          "
        >
          {t("reorder")}
        </button>

        {canCancel && (
          <button
            onClick={handleCancel}
            className="
              flex-1 h-[44px]
              rounded-md
              bg-destructive
              text-destructive-foreground
              text-sm font-medium
            "
          >
            {t("cancel")}
          </button>
        )}
      </div>
    </div>
  );
};
