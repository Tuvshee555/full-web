/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { Check, Copy, Loader2, MapPin, Phone, StickyNote, X } from "lucide-react";
import { normalizeDelivery } from "@admin/utils/normalizeDelivery";
import { formatDateTime, formatMNT, isGuestEmail } from "@admin/utils/format";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@admin/components/ui/sheet";
import { StatusPill } from "@admin/components/ui/status";
import { ConfirmDialog } from "@admin/components/ui/confirm-dialog";
import { ErrorState, LoadingRows, Notice } from "@admin/components/ui/feedback";
import { cn } from "@admin/lib/utils";
import {
  OrderStatus,
  PLACEHOLDER,
  RawOrder,
  STATUS_FLOW,
  nextStepKey,
  orderNumber,
  orderSteps,
  orderTone,
  paymentDisplay,
  primaryNext,
} from "./type";

type T = (key: string, params?: Record<string, string | number>) => string;

export function OrderStatusPill({ order, t }: { order: RawOrder; t: T }) {
  const status = (order.status ?? "PENDING") as OrderStatus;
  return <StatusPill tone={orderTone(order)}>{t(`order_status.${status}`)}</StatusPill>;
}

export function PaymentPill({ order, t }: { order: RawOrder; t: T }) {
  const { tone, key } = paymentDisplay(order);
  return <StatusPill tone={tone} icon={null}>{t(`payment_state.${key}`)}</StatusPill>;
}

export const customerName = (order: RawOrder, t: T) => {
  const d = normalizeDelivery(order);
  const name = [d?.lastName, d?.firstName].filter(Boolean).join(" ");
  if (name) return name;
  return isGuestEmail(order.user?.email) ? t("orders.guest") : order.user?.email ?? t("orders.guest");
};

export const addressLine = (order: RawOrder, t: T) => {
  const d = normalizeDelivery(order);
  return [d?.city, d?.district, d?.khoroo && t("orders.khoroo_n", { n: d.khoroo }), d?.address].filter(Boolean).join(", ");
};

/** Everything a courier needs, ready to paste into a chat. */
export const courierText = (order: RawOrder, t: T) => {
  const d = normalizeDelivery(order);
  const collect = order.paymentMethod === "COD" && order.paymentStatus !== "PAID";
  return [
    `#${orderNumber(order)}`,
    customerName(order, t),
    d?.phone,
    addressLine(order, t),
    d?.notes,
    collect ? t("orders.courier_collect", { amount: formatMNT(order.totalPrice) }) : null,
  ]
    .filter(Boolean)
    .join("\n");
};

/** The order's main next step as one button. Bank payments ask for confirmation first. */
export function NextStepButton({
  order,
  t,
  busy,
  onChange,
  className = "",
  size = "sm",
}: {
  order: RawOrder;
  t: T;
  busy: boolean;
  onChange: (next: OrderStatus) => void;
  className?: string;
  size?: "sm" | "md";
}) {
  const [confirmPayment, setConfirmPayment] = useState(false);
  const status = (order.status ?? "PENDING") as OrderStatus;
  const next = primaryNext(status, order.paymentMethod);
  if (!next) return null;
  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={(e) => {
          e.stopPropagation();
          if (next === "PAID") {
            setConfirmPayment(true);
            return;
          }
          onChange(next);
        }}
        className={cn("btn", size === "sm" && "btn-sm", className)}
      >
        {busy && <Loader2 aria-hidden className="h-[14px] w-[14px] animate-spin" />}
        {t(`order_action.${next}`)}
      </button>
      <ConfirmDialog
        open={confirmPayment}
        onOpenChange={setConfirmPayment}
        title={t("orders.confirm_bank.title")}
        description={t("orders.confirm_bank.body", { order: orderNumber(order), amount: formatMNT(order.totalPrice) })}
        confirmLabel={t("orders.confirm_bank.confirm")}
        busy={busy}
        onConfirm={() => {
          onChange(next);
          setConfirmPayment(false);
        }}
      />
    </>
  );
}

function Steps({ order, t }: { order: RawOrder; t: T }) {
  const steps = orderSteps(order);
  return (
    <ol className="grid grid-cols-4 gap-[6px]" aria-label={t("orders.drawer.progress")}>
      {steps.map((step) => (
        <li key={step.key} className="min-w-0" aria-current={step.state === "current" ? "step" : undefined}>
          <span className={cn("block h-[3px]", step.state === "done" ? "bg-ink" : step.state === "current" ? "bg-ink/40" : "bg-ink/10")} />
          <span className={cn("mt-[6px] flex items-center gap-[4px] text-[12px] leading-tight", step.state === "todo" ? "text-taupe" : "text-ink", step.state === "current" && "font-medium")}>
            {step.state === "done" && <Check aria-hidden className="h-[12px] w-[12px] shrink-0" strokeWidth={2.5} />}
            <span className="min-w-0">{t(`orders.steps.${step.key}`)}</span>
            <span className="sr-only">({t(`orders.steps.state_${step.state}`)})</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

const sectionTitle = "mb-[10px] text-[13px] font-semibold text-ink";

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  order: RawOrder | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  t: T;
  busy: boolean;
  copy: (value: string, done?: string) => void;
  onChange: (order: RawOrder, next: OrderStatus) => void;
};

/** All details of one order, and what to do with it next. Full screen on a phone. */
export function OrderDrawer({ open, onClose, order, loading, error, onRetry, t, busy, copy, onChange }: DrawerProps) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const status = (order?.status ?? "PENDING") as OrderStatus;
  const items = order ? order.orderItems ?? order.items ?? [] : [];
  const d = order ? normalizeDelivery(order) : null;
  const deliveryFee = Number(order?.deliveryFee ?? 0);
  // Product prices can change after purchase. The saved order total is authoritative.
  const subtotal = Math.max(0, Number(order?.totalPrice ?? 0) - deliveryFee);
  const canCancel = STATUS_FLOW[status]?.includes("CANCELLED");
  const nextKey = order ? nextStepKey(order) : "";
  const tone = order ? orderTone(order) : "neutral";

  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent side="right" hideClose className="flex w-full flex-col gap-0 border-l border-ink/10 bg-paper p-0 sm:max-w-[560px]">
        <div className="flex shrink-0 items-start justify-between gap-[12px] border-b border-ink/10 bg-white px-[16px] py-[14px] sm:px-[20px]">
          <div className="min-w-0">
            <SheetTitle className="text-[18px] font-semibold text-ink">
              {order ? t("orders.drawer.title", { order: orderNumber(order) }) : t("orders.drawer.loading")}
            </SheetTitle>
            <SheetDescription className="mt-[2px] text-[13px] text-taupe">
              {order ? t("orders.drawer.placed_at", { date: formatDateTime(order.createdAt) }) : " "}
            </SheetDescription>
          </div>
          <div className="flex shrink-0 items-center gap-[4px]">
            {order && (
              <button type="button" onClick={() => copy(orderNumber(order), t("orders.drawer.number_copied"))} className="btn-ghost btn-sm" title={t("orders.drawer.copy_number")}>
                <Copy aria-hidden className="h-[14px] w-[14px]" />
                <span className="hidden sm:inline">{t("orders.drawer.copy_number")}</span>
                <span className="sr-only sm:hidden">{t("orders.drawer.copy_number")}</span>
              </button>
            )}
            <button type="button" onClick={onClose} aria-label={t("common.close")} className="flex h-[44px] w-[44px] items-center justify-center text-taupe hover:bg-sand hover:text-ink">
              <X aria-hidden className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {!order ? (
            error ? <ErrorState className="m-[16px]" message={t("orders.errors.detail_failed")} onRetry={onRetry} retrying={loading} /> : <LoadingRows rows={5} />
          ) : (
            <div className="space-y-[14px] p-[16px] sm:p-[20px]">
              {/* Where the order is and what happens next */}
              <section className="admin-surface space-y-[14px] p-[16px]">
                <div className="flex flex-wrap items-center gap-[6px]">
                  <OrderStatusPill order={order} t={t} />
                  <PaymentPill order={order} t={t} />
                  <span className="text-[13px] text-taupe">· {t(`payment_method.${order.paymentMethod ?? "UNKNOWN"}`)}</span>
                </div>
                {status !== "CANCELLED" && <Steps order={order} t={t} />}
                <div className={cn("border-l-[3px] py-[2px] pl-[12px]", tone === "attention" ? "border-terracotta" : order.paymentStatus === "REVIEW" ? "border-terracotta" : "border-ink/20")}>
                  <p className="text-[13px] font-medium text-taupe">{t("orders.drawer.next_step")}</p>
                  <p className="mt-[2px] text-[14px] leading-relaxed text-ink">
                    {t(`orders.next.${nextKey}`, { amount: formatMNT(order.totalPrice) })}
                  </p>
                </div>
                {primaryNext(status, order.paymentMethod) && (
                  <NextStepButton order={order} t={t} busy={busy} size="md" className="w-full" onChange={(next) => onChange(order, next)} />
                )}
              </section>

              {order.paymentStatus === "REVIEW" && (
                <Notice tone="warning" role="status" title={t("orders.review.title")}>{t("orders.review.body")}</Notice>
              )}

              {/* Customer and delivery */}
              <section className="admin-surface p-[16px]">
                <h3 className={sectionTitle}>{t("orders.drawer.delivery")}</h3>
                <p className="text-[15px] font-medium text-ink">{customerName(order, t)}</p>
                {d?.phone && (
                  <div className="mt-[8px] flex flex-wrap gap-[8px]">
                    <a href={`tel:${d.phone}`} className="btn-secondary btn-sm">
                      <Phone aria-hidden className="h-[14px] w-[14px]" />
                      {t("orders.drawer.call", { phone: d.phone })}
                    </a>
                    <button type="button" onClick={() => copy(d.phone!, t("orders.drawer.phone_copied"))} className="btn-ghost btn-sm">
                      <Copy aria-hidden className="h-[14px] w-[14px]" />
                      {t("orders.drawer.copy_phone")}
                    </button>
                  </div>
                )}
                <p className="mt-[12px] flex items-start gap-[8px] text-[14px] leading-relaxed text-ink">
                  <MapPin aria-hidden className="mt-[3px] h-[15px] w-[15px] shrink-0 text-taupe" />
                  <span>{addressLine(order, t) || t("orders.drawer.no_address")}</span>
                </p>
                {d?.notes && (
                  <p className="mt-[10px] flex items-start gap-[8px] border border-terracotta/30 bg-terracotta/[0.04] px-[12px] py-[8px] text-[14px] text-ink">
                    <StickyNote aria-hidden className="mt-[3px] h-[15px] w-[15px] shrink-0 text-terracotta" />
                    <span><span className="sr-only">{t("orders.drawer.customer_note")}: </span>{d.notes}</span>
                  </p>
                )}
                <button type="button" onClick={() => copy(courierText(order, t), t("orders.drawer.courier_copied"))} className="btn-secondary btn-sm mt-[12px]">
                  <Copy aria-hidden className="h-[14px] w-[14px]" />
                  {t("orders.drawer.copy_courier")}
                </button>
              </section>

              {/* Items */}
              <section className="admin-surface p-[16px]">
                <h3 className={sectionTitle}>{t("orders.drawer.items", { count: items.reduce((s, it) => s + it.quantity, 0) })}</h3>
                <ul className="divide-y divide-ink/10 border-y border-ink/10">
                  {items.map((it, i) => (
                    <li key={it.id ?? `${order.id}-${i}`} className="flex items-center gap-[12px] py-[10px]">
                      <img
                        src={it.product?.image || PLACEHOLDER}
                        alt=""
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = PLACEHOLDER; }}
                        className="h-[48px] w-[48px] shrink-0 bg-sand object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-medium leading-snug text-ink">{it.product?.productName ?? "—"}</p>
                        <p className="text-[13px] text-taupe">
                          {it.size ? `${it.size} · ` : ""}
                          {t("orders.drawer.qty", { count: it.quantity })}
                        </p>
                      </div>
                      {it.unitPrice != null && (
                        <div className="shrink-0 text-right tabular-nums">
                          <p className="text-[14px] font-medium">{formatMNT(Number(it.unitPrice) * it.quantity)}</p>
                          {it.quantity > 1 && <p className="text-[12px] text-taupe">{formatMNT(Number(it.unitPrice))} × {it.quantity}</p>}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
                <dl className="mt-[10px] space-y-[4px] text-[14px]">
                  <div className="flex justify-between text-taupe">
                    <dt>{t("orders.drawer.subtotal")}</dt>
                    <dd className="tabular-nums">{formatMNT(subtotal)}</dd>
                  </div>
                  <div className="flex justify-between text-taupe">
                    <dt>{t("orders.drawer.delivery_fee")}</dt>
                    <dd className="tabular-nums">{deliveryFee ? formatMNT(deliveryFee) : t("orders.drawer.free")}</dd>
                  </div>
                  <div className="flex justify-between pt-[4px] text-[15px] font-semibold text-ink">
                    <dt>{t("orders.drawer.total")}</dt>
                    <dd className="tabular-nums">{formatMNT(order.totalPrice)}</dd>
                  </div>
                </dl>
              </section>

              {/* Payment */}
              <section className="admin-surface p-[16px]">
                <h3 className={sectionTitle}>{t("orders.drawer.payment")}</h3>
                <dl className="divide-y divide-ink/10 text-[14px]">
                  <div className="flex items-center justify-between gap-[16px] py-[8px]">
                    <dt className="text-taupe">{t("orders.drawer.method")}</dt>
                    <dd className="text-right text-ink">{t(`payment_method.${order.paymentMethod ?? "UNKNOWN"}`)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-[16px] py-[8px]">
                    <dt className="text-taupe">{t("orders.drawer.payment_state")}</dt>
                    <dd><PaymentPill order={order} t={t} /></dd>
                  </div>
                </dl>
                <p className="mt-[8px] text-[13px] leading-relaxed text-taupe">{t(`orders.payment_help.${order.paymentMethod ?? "UNKNOWN"}`)}</p>
              </section>

              {canCancel && (
                <section className="border border-terracotta/25 bg-white p-[16px]">
                  <h3 className={sectionTitle}>{t("orders.cancel.section")}</h3>
                  <p className="text-[13px] leading-relaxed text-taupe">{t("orders.cancel.hint")}</p>
                  <button type="button" disabled={busy} onClick={() => setConfirmCancel(true)} className="btn-secondary btn-sm btn-danger-text mt-[10px]">
                    {t("orders.cancel.button")}
                  </button>
                </section>
              )}
            </div>
          )}
        </div>

        {order && (
          <ConfirmDialog
            open={confirmCancel}
            onOpenChange={setConfirmCancel}
            tone="danger"
            title={t("orders.cancel.title", { order: orderNumber(order) })}
            description={t("orders.cancel.body")}
            confirmLabel={t("orders.cancel.confirm")}
            cancelLabel={t("orders.cancel.keep")}
            busy={busy}
            onConfirm={() => {
              onChange(order, "CANCELLED");
              setConfirmCancel(false);
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
