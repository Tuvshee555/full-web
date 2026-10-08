/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { API_BASE_URL } from "@/lib/api";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/app/(customer)/[locale]/provider/AuthProvider";

type Order = {
  id: string;
  orderNumber: string;
  totalPrice: number;
  status: string;
  paymentMethod: "BANK" | "QPAY" | "COD";
  createdAt: string;
};

export default function BankTransferPage() {
  const { t, locale } = useI18n();
  const { token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  // const [notifying, setNotifying] = useState(false);

  const orderId = searchParams.get("orderId");

  useEffect(() => {
    if (!token) {
      router.push(`/${locale}/log-in`);
      return;
    }
    if (!orderId) {
      toast.error(t("order_not_found"));
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        const res = await axios.get(
          `${API_BASE_URL}/order/${orderId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        if (res.data?.paymentMethod !== "BANK") {
          toast.error(t("invalid_payment_method"));
          router.push(`/${locale}`);
          return;
        }

        setOrder(res.data);
      } catch (err) {
        // console.error(err);
        toast.error(t("order_not_found"));
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, token, router, locale, t]);

  // copy helper
  const doCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("copied"));
    } catch {
      toast.error(t("copy_failed"));
    }
  };

  if (loading) {
    return (
      <p className="text-center mt-20 text-sm text-muted-foreground">
        {t("loading")}
      </p>
    );
  }

  if (!order) return null;

  // --- Bank details (replace with env or DB if you want dynamic) ---
  const BANK_NAME = "Хаан банк";
  const ACCOUNT_HOLDER = "Түвшинсайхан IBAN данс";
  const ACCOUNT_NUMBER = "230005005653699009";
  // -------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-background pt-[60px] pb-24 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">{t("bank_transfer_title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("bank_transfer_subtitle")}
          </p>
        </div>

        {/* Bank Info */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <InfoRow label={t("bank_name")} value={BANK_NAME} />
          <InfoRow label={t("account_holder")} value={ACCOUNT_HOLDER} />
          <InfoRow
            label={t("account_number")}
            value={ACCOUNT_NUMBER}
            copy
            onCopy={() => doCopy(ACCOUNT_NUMBER)}
          />
          <InfoRow
            label={t("transfer_description")}
            value={order.orderNumber}
            copy
            highlight
            onCopy={() => doCopy(order.orderNumber)}
          />
        </div>

        {/* Amount */}
        <div className="bg-card border border-border rounded-xl p-6 flex justify-between items-center">
          <span className="text-sm font-medium">{t("total_amount")}</span>
          <span className="text-lg font-semibold">
            {order.totalPrice.toLocaleString()}₮
          </span>
        </div>

        {/* Notice */}
        <div className="bg-muted/40 border border-border rounded-xl p-4 text-sm">
          {t("bank_transfer_notice")}{" "}
          <span className="font-medium">{order.orderNumber}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="w-full h-[44px]"
            onClick={() => router.push(`/${locale}`)}
          >
            {t("back_home")}
          </Button>

          <Button
            className="w-full h-[44px]"
            onClick={() => router.push(`/${locale}/profile/orders/${order.id}`)}
          >
            {t("view_order")}
          </Button>
        </div>

        {/* Secondary actions: notify admin */}
        <div>
          <Button
            variant="ghost"
            className="w-full h-[44px] border border-border"
            onClick={() => doCopy(`${ACCOUNT_NUMBER} • ${order.orderNumber}`)}
          >
            {t("copy_all")}
          </Button>
        </div>

        {/* <div className="flex gap-3">
          <Button
            variant="ghost"
            className="w-full h-[44px] border border-border"
            onClick={() => doCopy(`${ACCOUNT_NUMBER} • ${order.orderNumber}`)}
          >
            {t("copy_all")}
          </Button>

          <Button
            className="w-full h-[44px]"
            onClick={notifyPaid}
            disabled={notifying}
          >
            {notifying ? t("sending") : t("bank_i_transferred")}
          </Button>
        </div> */}
      </div>
    </div>
  );
}

/* ---------- Helper ---------- */

function InfoRow({
  label,
  value,
  copy = false,
  highlight = false,
  onCopy,
}: {
  label: string;
  value: string;
  copy?: boolean;
  highlight?: boolean;
  onCopy?: () => void;
}) {
  return (
    <div className="flex justify-between items-center gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span
          className={`text-sm font-medium ${highlight ? "text-primary" : ""}`}
        >
          {value}
        </span>
        {copy && (
          <button
            onClick={() => {
              if (onCopy) onCopy();
              else {
                navigator.clipboard.writeText(value);
                // toast is not imported here; page level toast will show
              }
            }}
            className="text-xs text-primary hover:underline"
          >
            Copy
          </button>
        )}
      </div>
    </div>
  );
}
