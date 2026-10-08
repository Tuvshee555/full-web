/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import { usePaymentPending } from "./components/usePaymentPending";
import { PaymentStatusCard } from "./components/PaymentStatusCard";
import { OrderDetailsCard } from "./components/OrderDetailsCard";

export default function PaymentPendingInner() {
  const { t, orderId, order, qrText, paid, status } = usePaymentPending() as {
    t: (k: string) => string;
    orderId?: string | null;
    order?: any;
    qrText?: string | null;
    paid?: boolean;
    status?: string | null;
  };

  if (!orderId) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">{t("order_invalid_url")}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-6 lg:pt-20 pb-56 lg:pb-28 bg-background">
      <div className="mx-auto max-w-6xl px-4 grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-10 items-start">
        {/* LEFT — PAYMENT */}
        <div className="space-y-6">
          <section className="text-center space-y-2">
            <h1 className="text-2xl font-semibold">
              {paid ? t("payment_success_title") : t("payment_waiting_title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("payment_waiting_subtitle")}
            </p>
          </section>

          <PaymentStatusCard
            t={t}
            qrText={qrText}
            paid={paid}
            status={status}
          />
        </div>

        {/* RIGHT — ORDER */}
        {order && <OrderDetailsCard t={t} order={order} />}
      </div>
    </main>
  );
}
