"use client";

import { API_BASE_URL } from "@/lib/api";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { motion } from "framer-motion";
import { Clock, MapPin, Receipt, ArrowRight } from "lucide-react";

import { useAuth } from "../../provider/AuthProvider";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import { fadeUp, staggerContainer } from "@/utils/animations";

export type OrderStatus =
  | "PENDING"
  | "WAITING_PAYMENT"
  | "COD_PENDING"
  | "PAID"
  | "DELIVERING"
  | "DELIVERED"
  | "CANCELLED";

export type OrderListItem = {
  id: string;
  _id?: string;
  orderNumber: string;
  totalPrice: number;
  status: OrderStatus;
  paymentMethod: "COD" | "BANK" | "QPAY";
  createdAt: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  city?: string | null;
  district?: string | null;
  khoroo?: string | null;
  address?: string | null;
};

const STATUS_STYLE: Record<OrderStatus, string> = {
  PENDING:         "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
  WAITING_PAYMENT: "bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800",
  COD_PENDING:     "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
  PAID:            "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800",
  DELIVERING:      "bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800",
  DELIVERED:       "bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
  CANCELLED:       "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800",
};

export const OrdersList = () => {
  const { userId, token } = useAuth();
  const { locale, t } = useI18n();

  const fetchOrders = async (): Promise<OrderListItem[]> => {
    if (!userId || !token) return [];
    const res = await axios.get(
      `${API_BASE_URL}/order/user/${userId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const payload = res.data;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.orders)) return payload.orders;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.results)) return payload.results;
    return [];
  };

  const { data: orders = [], isLoading, isFetching, isError } = useQuery({
    queryKey: ["orders", userId],
    queryFn: fetchOrders,
    enabled: Boolean(userId && token),
    retry: 1,
    refetchInterval: (query) => {
      const list = (query.state.data as OrderListItem[]) || [];
      return list.some((o) => o.status === "WAITING_PAYMENT" && o.paymentMethod === "QPAY") ? 30000 : false;
    },
    refetchOnWindowFocus: true,
  });

  const statusLabel: Record<OrderStatus, string> = {
    PENDING:         t("order_status_pending"),
    WAITING_PAYMENT: t("order_status_waiting_payment"),
    COD_PENDING:     t("order_status_cod_pending"),
    PAID:            t("order_status_paid"),
    DELIVERING:      t("order_status_delivering"),
    DELIVERED:       t("order_status_delivered"),
    CANCELLED:       t("order_status_cancelled"),
  };

  if (isLoading) {
    return (
      <div className="space-y-3 mt-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-card border border-border animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center mt-12 space-y-2">
        <p className="text-sm text-muted-foreground">
          {t("orders_load_failed", "Захиалгын мэдээлэл ачаалахад алдаа гарлаа.")}
        </p>
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="text-center mt-16 space-y-2">
        <Receipt className="mx-auto w-6 h-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t("orders_empty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-5 pb-[200px] sm:pb-8">
      <div className="flex items-center gap-2 mb-2">
        <Receipt className="w-5 h-5" />
        <h1 className="text-lg font-semibold">{t("my_orders")}</h1>
      </div>

      <motion.div
        className="space-y-3"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        {orders.map((order) => {
          const orderId = order.id ?? order._id ?? "";
          if (!orderId) return null;
          const addressLine = [order.city, order.district, order.khoroo, order.address]
            .filter(Boolean)
            .join(", ");

          return (
            <motion.div key={orderId} variants={fadeUp}>
              <Link href={`/${locale}/profile/orders/${orderId}`}>
                <motion.div
                  whileHover={{ x: 3 }}
                  transition={{ duration: 0.15 }}
                  className="group bg-card border border-border rounded-2xl p-5
                    hover:border-primary/30 hover:shadow-md transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Order ID + status */}
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <span className="font-mono font-bold text-base">#{order.orderNumber}</span>
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${STATUS_STYLE[order.status]}`}>
                          {statusLabel[order.status]}
                        </span>
                      </div>

                      {/* Meta row */}
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(order.createdAt).toLocaleDateString()}
                        </span>
                        {addressLine && (
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[200px]">{addressLine}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Price + arrow */}
                    <div className="text-right shrink-0">
                      <p className="font-bold text-lg">{order.totalPrice.toLocaleString()}₮</p>
                      <span className="text-xs text-muted-foreground flex items-center gap-1
                        justify-end mt-1 group-hover:text-primary transition-colors">
                        {t("view_details")} <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>

      {isFetching && (
        <p className="text-xs text-center text-muted-foreground">{t("refreshing")}</p>
      )}
    </div>
  );
};
