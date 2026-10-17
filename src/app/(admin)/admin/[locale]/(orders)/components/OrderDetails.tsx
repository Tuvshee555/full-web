/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { Copy, Loader2, Phone } from "lucide-react";
import { normalizeDelivery } from "@admin/utils/normalizeDelivery";
import { formatDateTime, formatMNT } from "@admin/utils/format";
import { OrderStatus, PLACEHOLDER, RawOrder, STATUS_BADGE, STATUS_FLOW, primaryNext } from "./type";

type T = (key: string, params?: Record<string, string | number>) => string;

export function StatusBadge({ status, t }: { status: OrderStatus; t: T }) {
  return (
    <span className={`inline-flex whitespace-nowrap px-[10px] py-[3px] text-[12px] font-medium ${STATUS_BADGE[status]}`}>
      {t(`order_status.${status}`)}
    </span>
  );
}

/** Primary "next step" button for an order, e.g. "Хүргэлтэнд гаргах". */
export function NextStepButton({
  order,
  t,
  busy,
  onChange,
  className = "",
}: {
  order: RawOrder;
  t: T;
  busy: boolean;
  onChange: (next: OrderStatus) => void;
  className?: string;
}) {
  const status = (order.status ?? "PENDING") as OrderStatus;
  const next = primaryNext(status, order.paymentMethod);
  if (!next) return null;
  return (
    <button
      type="button"
      disabled={busy}
      onClick={(e) => {
        e.stopPropagation();
        onChange(next);
      }}
      className={`inline-flex h-[36px] items-center justify-center gap-[6px] whitespace-nowrap bg-ink px-[14px] text-[13px] font-medium text-paper transition-colors hover:bg-[#3a2f28] disabled:opacity-50 ${className}`}
    >
      {busy && <Loader2 className="h-[14px] w-[14px] animate-spin" />}
      {t(`order_action.${next}`)}
    </button>
  );
}

type Props = {
  order: RawOrder;
  t: T;
  busy: boolean;
  copy: (value: string) => void;
  onChange: (next: OrderStatus) => void;
};

export function OrderDetails({ order, t, busy, copy, onChange }: Props) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const status = (order.status ?? "PENDING") as OrderStatus;
  const items = order.foodOrderItems ?? order.items ?? [];
  const d = normalizeDelivery(order);
  const name = [d?.lastName, d?.firstName].filter(Boolean).join(" ") || order.user?.email || "—";
  const addressLine = [d?.city, d?.district, d?.khoroo && t("orders_ui.khoroo_n", { n: d.khoroo }), d?.address].filter(Boolean).join(", ");
  const subtotal = items.reduce((s, it) => s + (it.food?.price ?? 0) * it.quantity, 0);
  const deliveryFee = Number(order.deliveryFee ?? 0);
  const next = primaryNext(status, order.paymentMethod);
  const others = STATUS_FLOW[status].filter((s) => s !== next && s !== "CANCELLED");
  const canCancel = STATUS_FLOW[status].includes("CANCELLED");

  const courierText = [`#${order.orderNumber ?? order.id}`, name, d?.phone, addressLine, d?.notes].filter(Boolean).join("\n");

  const section = "eyebrow mb-[12px]";
  const row = "flex items-start justify-between gap-[16px] py-[7px] text-[13px]";

  return (
    <div className="grid gap-[28px] bg-paper px-[16px] py-[20px] md:px-[24px] lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.9fr)]">
      {/* Items */}
      <div>
        <h4 className={section}>{t("orders_ui.items")}</h4>
        <ul className="divide-y divide-ink/10 border-y border-ink/10">
          {items.map((it, i) => (
            <li key={`${order.id}-${i}`} className="flex items-center gap-[12px] py-[10px]">
              <img
                src={it.food?.image || PLACEHOLDER}
                alt=""
                onError={(e) => (e.currentTarget.src = PLACEHOLDER)}
                className="h-[48px] w-[48px] shrink-0 object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-ink">{it.food?.foodName ?? "—"}</p>
                <p className="text-[12px] text-taupe tabular-nums">
                  {it.quantity} × {formatMNT(it.food?.price)}
                  {"size" in it && (it as { size?: string }).size ? ` · ${(it as { size?: string }).size}` : ""}
                </p>
              </div>
              <span className="text-[13px] font-medium tabular-nums text-ink">
                {formatMNT((it.food?.price ?? 0) * it.quantity)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-[8px] space-y-[2px] text-[13px]">
          <div className="flex justify-between text-taupe">
            <span>{t("orders_ui.subtotal")}</span>
            <span className="tabular-nums">{formatMNT(subtotal)}</span>
          </div>
          <div className="flex justify-between text-taupe">
            <span>{t("orders_ui.delivery_fee")}</span>
            <span className="tabular-nums">{formatMNT(deliveryFee)}</span>
          </div>
          <div className="flex justify-between pt-[4px] text-[14px] font-medium text-ink">
            <span>{t("orders_ui.total")}</span>
            <span className="tabular-nums">{formatMNT(order.totalPrice)}</span>
          </div>
        </div>
      </div>

      {/* Customer + delivery */}
      <div>
        <h4 className={section}>{t("delivery")}</h4>
        <p className="text-[15px] font-medium text-ink">{name}</p>
        {d?.phone && (
          <div className="mt-[6px] flex items-center gap-[8px]">
            <a href={`tel:${d.phone}`} className="inline-flex items-center gap-[6px] text-[14px] text-ink underline-offset-4 hover:underline">
              <Phone className="h-[14px] w-[14px]" strokeWidth={1.5} />
              {d.phone}
            </a>
            <button
              type="button"
              onClick={() => copy(d.phone!)}
              className="flex h-[28px] w-[28px] items-center justify-center text-taupe hover:bg-sand hover:text-ink"
              aria-label={t("copy")}
              title={t("copy")}
            >
              <Copy className="h-[13px] w-[13px]" />
            </button>
          </div>
        )}
        <p className="mt-[10px] text-[13px] leading-[1.6] text-ink">{addressLine || "—"}</p>
        {d?.notes && (
          <p className="mt-[10px] border border-terracotta/30 bg-white px-[12px] py-[8px] text-[13px] text-ink">
            {d.notes}
          </p>
        )}
        <button
          type="button"
          onClick={() => copy(courierText)}
          className="mt-[12px] inline-flex h-[32px] items-center gap-[6px] border border-ink/20 px-[10px] text-[12px] text-ink hover:border-ink"
        >
          <Copy className="h-[12px] w-[12px]" />
          {t("orders_ui.copy_for_courier")}
        </button>
      </div>

      {/* Payment + actions */}
      <div>
        <h4 className={section}>{t("orders_ui.payment")}</h4>
        <div className="divide-y divide-ink/10 border-y border-ink/10">
          <div className={row}>
            <span className="text-taupe">{t("payment_method")}</span>
            <span className="text-right text-ink">{t(`payment_method.${order.paymentMethod ?? "UNKNOWN"}`)}</span>
          </div>
          <div className={row}>
            <span className="text-taupe">{t("status")}</span>
            <StatusBadge status={status} t={t} />
          </div>
          <div className={row}>
            <span className="text-taupe">{t("created_at")}</span>
            <span className="tabular-nums text-ink">{formatDateTime(order.createdAt)}</span>
          </div>
          <div className={row}>
            <span className="text-taupe">{t("order_number")}</span>
            <button type="button" onClick={() => copy(order.orderNumber ?? order.id)} className="inline-flex items-center gap-[6px] font-mono text-[12px] text-ink hover:underline">
              #{order.orderNumber ?? order.id.slice(0, 8)}
              <Copy className="h-[11px] w-[11px] text-taupe" />
            </button>
          </div>
        </div>

        {confirmCancel ? (
          <div className="mt-[16px] border border-terracotta/40 bg-white p-[14px]">
            <p className="text-[13px] font-medium text-ink">{t("orders_ui.cancel_title")}</p>
            <p className="mt-[4px] text-[12px] text-taupe">{t("orders_ui.cancel_body")}</p>
            <div className="mt-[12px] flex gap-[8px]">
              <button type="button" onClick={() => setConfirmCancel(false)} className="h-[36px] flex-1 border border-ink/20 text-[13px] hover:border-ink">
                {t("orders_ui.keep_order")}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  onChange("CANCELLED");
                  setConfirmCancel(false);
                }}
                className="h-[36px] flex-1 bg-terracotta text-[13px] font-medium text-paper disabled:opacity-50"
              >
                {t("orders_ui.cancel_confirm")}
              </button>
            </div>
          </div>
        ) : (
          (next || others.length > 0 || canCancel) && (
            <div className="mt-[16px] flex flex-col gap-[8px]">
              <NextStepButton order={order} t={t} busy={busy} onChange={onChange} className="h-[44px] w-full" />
              {others.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={busy}
                  onClick={() => onChange(s)}
                  className="h-[40px] w-full border border-ink/25 text-[13px] text-ink hover:border-ink disabled:opacity-50"
                >
                  {t(`order_action.${s}`)}
                </button>
              ))}
              {canCancel && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmCancel(true)}
                  className="h-[36px] text-[13px] text-terracotta hover:underline disabled:opacity-50"
                >
                  {t("orders_ui.cancel_order")}
                </button>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}
