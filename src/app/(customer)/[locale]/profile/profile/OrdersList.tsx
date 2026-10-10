"use client";

import Link from "next/link";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { useAuth } from "../../provider/AuthProvider";
import { useStoreT } from "@/components/store/lib/useStoreT";
import { collectionUrl, formatDate, money } from "@/components/store/lib/product";
import { OrderStatusBadge } from "../orders/components/OrderStatusBadge";

export type OrderStatus = "PENDING" | "WAITING_PAYMENT" | "COD_PENDING" | "PAID" | "DELIVERING" | "DELIVERED" | "CANCELLED";

export type OrderListItem = {
  id: string;
  _id?: string;
  orderNumber: string;
  totalPrice: number;
  status: OrderStatus;
  paymentMethod: "COD" | "BANK" | "QPAY";
  createdAt: string;
};

/** Order history as a clean table (stacked rows on phones). */
export const OrdersList = () => {
  const { userId, token } = useAuth();
  const { st, locale } = useStoreT();

  const { data: orders = [], isLoading, isError } = useQuery({
    queryKey: ["orders", userId],
    enabled: Boolean(userId && token),
    retry: 1,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<OrderListItem[]> => {
      const res = await axios.get(`${API_BASE_URL}/order/user/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
      const p = res.data;
      return Array.isArray(p) ? p : (p?.orders ?? p?.data ?? p?.results ?? []);
    },
    // Keep checking while a QPay order is still waiting
    refetchInterval: (q) =>
      ((q.state.data as OrderListItem[]) || []).some((o) => o.status === "WAITING_PAYMENT" && o.paymentMethod === "QPAY") ? 30000 : false,
  });

  if (isLoading) {
    return (
      <div className="space-y-[2px]">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[64px] animate-pulse bg-sand/70" />
        ))}
      </div>
    );
  }

  if (isError) return <p className="text-[15px] text-ink/60">{st("orders_error")}</p>;

  if (!orders.length) {
    return (
      <div className="py-[40px]">
        <p className="store-heading text-[30px]">{st("no_orders")}</p>
        <Link href={collectionUrl(locale)} className="btn group mt-[24px]">
          {st("continue_shopping")}
          <span className="btn-arrow">
            <ArrowRight className="h-[16px] w-[16px]" strokeWidth={1.3} />
          </span>
        </Link>
      </div>
    );
  }


  return (
    <div>
      <div className="hidden grid-cols-[1.2fr_1fr_1.3fr_1fr_24px] gap-[16px] border-b border-ink/15 pb-[12px] md:grid">
        {[st("col_order"), st("col_date"), st("col_status"), st("col_total")].map((h, i) => (
          <span key={h} className={`eyebrow ${i === 3 ? "text-right" : ""}`}>
            {h}
          </span>
        ))}
        <span />
      </div>
      <ul>
        {orders.map((o) => {
          const id = o.id ?? o._id ?? "";
          if (!id) return null;
          return (
            <li key={id} className="border-b border-ink/10">
              <Link
                href={`/${locale}/profile/orders/${id}`}
                className="group grid grid-cols-[1fr_auto] items-center gap-x-[16px] gap-y-[6px] py-[18px] transition-colors hover:bg-sand/40 md:grid-cols-[1.2fr_1fr_1.3fr_1fr_24px] md:py-[20px]"
              >
                <span className="store-heading text-[22px]">#{o.orderNumber}</span>
                <span className="text-right text-[15px] font-medium md:hidden">{money(o.totalPrice)}</span>
                <span className="text-[14px] text-ink/60">{formatDate(o.createdAt, locale)}</span>
                <span className="justify-self-end md:justify-self-start">
                  <OrderStatusBadge status={o.status} />
                </span>
                <span className="hidden text-right text-[15px] font-medium md:block">{money(o.totalPrice)}</span>
                <ArrowRight
                  className="hidden h-[16px] w-[16px] text-ink/40 transition-transform duration-500 ease-silk group-hover:translate-x-[3px] group-hover:text-ink md:block"
                  strokeWidth={1.3}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
