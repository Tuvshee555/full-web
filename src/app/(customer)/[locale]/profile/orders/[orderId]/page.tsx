/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { useAuth } from "@/app/(customer)/[locale]/provider/AuthProvider";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import { useStoreT } from "@/components/store/lib/useStoreT";
import { OrderSummary } from "@/components/store/order/OrderStatusShell";
import { formatDate } from "@/components/store/lib/product";
import { OrderStatusBadge } from "../components/OrderStatusBadge";
import { QPayPaymentBlock } from "../components/QPayPaymentBlock";
import { OrderReviewSection } from "./components/OrderReviewSection";
import type { OrderDetails, OrderStatus } from "./components/types";

// Where each backend status sits on the 4-step tracker
const STEP: Record<OrderStatus, number> = {
  PENDING: 0,
  WAITING_PAYMENT: 0,
  COD_PENDING: 0,
  PAID: 1,
  DELIVERING: 2,
  DELIVERED: 3,
  CANCELLED: -1,
};

export default function OrderDetailPage() {
  const { userId, token, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const { st, locale } = useStoreT();
  const router = useRouter();
  const params = useParams();
  const orderId = typeof params.orderId === "string" ? params.orderId : null;

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");

  const fetchOrder = useCallback(async () => {
    if (!orderId || !token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/order/${orderId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      setOrder(await res.json());
      setState("ready");
    } catch {
      setState("missing");
    }
  }, [orderId, token]);

  useEffect(() => {
    if (authLoading) return;
    if (!token || !userId) {
      router.push(`/${locale}/sign-in?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    fetchOrder();
  }, [authLoading, token, userId, fetchOrder]);

  if (state === "loading") return <div className="page-width min-h-[60vh] pt-[72px]"><div className="h-[320px] animate-pulse bg-sand/70" /></div>;

  if (state === "missing" || !order) {
    return (
      <div className="page-width pb-[96px] pt-[72px]">
        <h1 className="store-heading text-[44px]">{st("order_not_found")}</h1>
        <Link href={`/${locale}/profile`} className="link-underline mt-[16px] inline-block text-ink">
          {st("back_to_orders")}
        </Link>
      </div>
    );
  }

  const step = STEP[order.status] ?? 0;
  const placed = formatDate(order.createdAt, locale);
  const steps = [st("step_ordered"), st("step_paid"), st("step_delivering"), st("step_delivered")];

  return (
    <div className="page-width pb-[96px] pt-[32px] md:pt-[56px]">
      <Link href={`/${locale}/profile`} className="group inline-flex items-center gap-[8px] text-[14px] text-ink/70 hover:text-ink">
        <ArrowLeft className="h-[15px] w-[15px] transition-transform duration-500 ease-silk group-hover:-translate-x-[3px]" strokeWidth={1.3} />
        {st("back_to_orders")}
      </Link>

      <div className="mt-[24px] grid gap-[40px] lg:grid-cols-12 lg:gap-[48px]">
        <div className="lg:col-span-7">
          {/* Shopify order-status style: the status IS the headline */}
          <span className="eyebrow">
            #{order.orderNumber} · {st("placed_on", { date: placed })}
          </span>
          <h1 className="store-heading mt-[10px] text-[48px] md:text-[64px]">{st(`os_${order.status}_t`)}</h1>
          <p className="mt-[8px] text-[16px] text-ink/70">{st(`os_${order.status}_s`)}</p>
          <div className="mt-[14px] flex flex-wrap items-center gap-x-[18px] gap-y-[6px] text-[14px] text-ink/60">
            <OrderStatusBadge status={order.status} />
            <span>{t(`payment_method_${String(order.paymentMethod).toLowerCase()}`)}</span>
          </div>

          {/* Progress tracker */}
          {step >= 0 ? (
            <ol className="mt-[36px] grid grid-cols-4 gap-[8px]">
              {steps.map((label, i) => {
                const done = i <= step;
                return (
                  <li key={label}>
                    <div className="h-[2px] bg-ink/10">
                      <div className={`h-full bg-ink transition-[width] duration-1000 ease-silk ${done ? "w-full" : "w-0"}`} />
                    </div>
                    <div className="mt-[12px] flex items-start gap-[6px]">
                      {done && <Check className="mt-[2px] h-[13px] w-[13px] shrink-0 text-ink" strokeWidth={1.8} />}
                      <span className={`text-[12px] leading-tight md:text-[13px] ${done ? "text-ink" : "text-ink/40"}`}>{label}</span>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <Link href={`/${locale}/collections/all`} className="btn group mt-[28px]">
              {st("shop_again")}
              <span className="btn-arrow">
                <ArrowRight className="h-[16px] w-[16px]" strokeWidth={1.3} />
              </span>
            </Link>
          )}

          <div className="mt-[40px] space-y-[40px]">
            <QPayPaymentBlock order={order} onRefresh={fetchOrder} />
            <OrderReviewSection order={order} token={token} />
          </div>
        </div>

        <aside className="lg:col-span-5">
          <div className="bg-sand p-[24px] md:p-[32px] lg:sticky lg:top-[110px]">
            <OrderSummary order={order} />
          </div>
        </aside>
      </div>
    </div>
  );
}
