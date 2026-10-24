/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { ArrowRight } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import { useStoreT } from "@/components/store/lib/useStoreT";
import { OrderStatusShell } from "@/components/store/order/OrderStatusShell";
import { BankDetails } from "@/components/store/order/BankDetails";

/** Bank-transfer "thank you" page: account details to transfer to + order summary. */
export default function BankTransferPage() {
  const { t } = useI18n();
  const { st, locale } = useStoreT();
  const orderId = useSearchParams()?.get("orderId");
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    // Read the token directly: the auth context hydrates a tick later, and a
    // guest who just checked out must not be bounced to a login page.
    const token = localStorage.getItem("token");
    if (!orderId || !token) return setState("missing");
    const controller = new AbortController();
    setOrder(null);
    setState("loading");
    axios
      .get(`${API_BASE_URL}/order/${encodeURIComponent(orderId)}`, { headers: { Authorization: `Bearer ${token}` }, timeout: 25_000, signal: controller.signal })
      .then((res) => {
        if (controller.signal.aborted) return;
        // An old confirmation URL must not invite a second transfer after
        // payment, or offer bank transfer for another payment method.
        if (res.data?.paymentMethod !== "BANK" || !["PENDING", "WAITING_PAYMENT"].includes(res.data?.status)) {
          router.replace(`/${locale}/profile/orders/${encodeURIComponent(orderId)}`);
          return;
        }
        setOrder(res.data);
        setState("ready");
      })
      .catch(() => { if (!controller.signal.aborted) setState("missing"); });
    return () => controller.abort();
  }, [orderId, locale, router]);

  return (
    <OrderStatusShell order={state === "ready" ? order : undefined}>
      {state === "loading" && <div className="h-[300px] animate-pulse bg-sand" />}

      {state === "missing" && (
        <div>
          <h1 className="store-heading text-[40px]">{st("order_not_found")}</h1>
          <Link href={`/${locale}`} className="link-underline mt-[16px] inline-block text-ink">
            {st("back_to_store")}
          </Link>
        </div>
      )}

      {state === "ready" && order && (
        <>
          <span className="eyebrow">{st("order_n", { n: order.orderNumber })}</span>
          <h1 className="store-heading mt-[12px] text-[44px] md:text-[56px]">{t("bank_transfer_title")}</h1>
          <p className="mt-[10px] text-[15px] text-ink/70">{t("bank_transfer_subtitle")}</p>

          <div className="mt-[32px]">
            <BankDetails orderNumber={order.orderNumber} amount={order.totalPrice} orderId={order.id} />
          </div>

          <div className="mt-[32px] flex flex-col-reverse gap-[16px] sm:flex-row sm:items-center sm:justify-between">
            <Link href={`/${locale}`} className="link-underline text-[14px] text-ink">
              {st("back_to_store")}
            </Link>
            <Link href={`/${locale}/profile/orders/${order.id}`} className="btn group">
              {st("view_order")}
              <span className="btn-arrow">
                <ArrowRight className="h-[16px] w-[16px]" strokeWidth={1.3} />
              </span>
            </Link>
          </div>
        </>
      )}
    </OrderStatusShell>
  );
}

