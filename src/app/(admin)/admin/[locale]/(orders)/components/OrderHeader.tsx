"use client";

import { Copy, ChevronDown, ChevronUp } from "lucide-react";
import { OrderStatus, RawOrder, STATUS_BADGE, STATUS_FLOW } from "./type";

type Props = {
  order: RawOrder;
  idx: number;
  page: number;
  limit: number;
  itemsCount: number;
  t: (key: string) => string;
  copy: (id: string) => void;
  toggle: (id: string) => void;
  changeStatus: (id: string, status: OrderStatus) => void;
};

export function OrderHeader({
  order,
  idx,
  page,
  limit,
  itemsCount,
  t,
  copy,
  toggle,
  changeStatus,
}: Props) {
  const status = order.status ?? "PENDING";
  const isExpanded = Boolean(order.__expanded);

  return (
    <div className="p-4 md:p-5">
      {/* TOP ROW (mobile + desktop) */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-foreground shrink-0">
          #{idx + 1 + (page - 1) * limit}
        </span>

        <h2 className="text-sm font-semibold truncate text-foreground">
          {order.orderNumber ? `#${order.orderNumber}` : order.id}
        </h2>

        <button
          onClick={() => copy(order.id)}
          className="inline-flex items-center shrink-0"
          title={t("copy")}
        >
          <Copy className="w-4 h-4" />
        </button>

        {/* PRICE (desktop only here) */}
        <div className="ml-auto hidden md:block text-sm font-semibold text-foreground">
          ₮{(order.totalPrice ?? 0).toLocaleString()}
        </div>
      </div>

      {/* META */}
      <div className="mt-2 text-sm text-foreground break-all">
        {order.user?.email ?? t("no_email")}
        {order.user?.id && ` · user:${order.user.id}`}
      </div>

      <div className="text-sm text-foreground">
        {order.createdAt ? new Date(order.createdAt).toLocaleString() : ""}
      </div>

      {/* ACTIONS */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {/* PRICE (mobile) */}
        <div className="md:hidden text-sm font-semibold text-foreground mr-auto">
          ₮{(order.totalPrice ?? 0).toLocaleString()}
        </div>

        {/* STATUS BADGE */}
        <span
          className={`text-xs px-2 py-1 rounded-full border font-medium ${STATUS_BADGE[status]}`}
        >
          {t(`order_status.${status}`)}
        </span>

        {/* STATUS SELECT */}
        <select
          value={status}
          onChange={(e) =>
            changeStatus(order.id, e.target.value as OrderStatus)
          }
          className="px-3 py-1.5 text-xs rounded-full border font-medium text-foreground"
          title={t("change_status")}
        >
          <option value={status}>{t(`order_status.${status}`)}</option>

          {STATUS_FLOW[status].map((s) => (
            <option key={s} value={s}>
              {t(`order_status.${s}`)}
            </option>
          ))}
        </select>

        {/* EXPAND */}
        <button
          onClick={() => toggle(order.id)}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border rounded-full text-foreground"
        >
          {itemsCount} {t("items_short")}
          {isExpanded ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </button>
      </div>
    </div>
  );
}
