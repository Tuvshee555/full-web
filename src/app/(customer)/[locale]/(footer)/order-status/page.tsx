/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Check, Loader2 } from "lucide-react";
import { STORE } from "@/config/store";
import { API_BASE_URL } from "@/lib/api";
import { imageUrl } from "@/lib/image";
import { InfoPage } from "@/components/store/InfoPage";
import { formatDate, money } from "@/components/store/lib/product";
import { useStoreT } from "@/components/store/lib/useStoreT";

type LookedUp = {
  orderNumber: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  totalPrice: number;
  deliveryFee: number;
  createdAt: string;
  updatedAt: string;
  city: string | null;
  district: string | null;
  items: { productName: string; image: string | null; size: string | null; quantity: number; lineTotal: number | null }[];
};

type Problem = "number" | "phone" | "not_found" | "too_many" | "failed" | null;

/** A guest checks an order from any device with the order number and the phone number used at checkout. */
export default function OrderStatusPage() {
  const { st, locale } = useStoreT();
  const [number, setNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem>(null);
  const [order, setOrder] = useState<LookedUp | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const cleanNumber = number.trim().replace(/^#/, "");
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanNumber) return setProblem("number");
    if (cleanPhone.length !== 8) return setProblem("phone");
    setBusy(true);
    setProblem(null);
    try {
      const res = await fetch(`${API_BASE_URL}/order/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: cleanNumber, phone: cleanPhone }),
      });
      if (res.ok) {
        setOrder(await res.json());
      } else {
        setProblem(res.status === 404 || res.status === 400 ? "not_found" : res.status === 429 ? "too_many" : "failed");
      }
    } catch {
      setProblem("failed");
    } finally {
      setBusy(false);
    }
  };

  const message = problem && {
    number: st("lookup_number_required"),
    phone: st("phone_invalid"),
    not_found: st("lookup_not_found"),
    too_many: st("lookup_too_many"),
    failed: st("lookup_failed"),
  }[problem];

  return (
    <InfoPage title={st("lookup_title")} intro={st("lookup_intro")}>
      {order ? (
        <LookupResult order={order} locale={locale} onAgain={() => { setOrder(null); setNumber(""); }} />
      ) : (
        <form onSubmit={submit} noValidate className="space-y-[14px]">
          <div className="field" data-error={problem === "number" || problem === "not_found"}>
            <input
              id="lookup-number"
              placeholder=" "
              value={number}
              onChange={(e) => setNumber(e.target.value.toUpperCase())}
              autoComplete="off"
              autoCapitalize="characters"
              aria-describedby="lookup-number-hint"
              aria-invalid={problem === "number"}
            />
            <label htmlFor="lookup-number">{st("lookup_number")}</label>
          </div>
          <p id="lookup-number-hint" className="-mt-[6px] text-[13px] text-taupe">{st("lookup_number_hint")}</p>
          <div className="field" data-error={problem === "phone" || problem === "not_found"}>
            <input
              id="lookup-phone"
              placeholder=" "
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              autoComplete="tel"
              aria-invalid={problem === "phone"}
            />
            <label htmlFor="lookup-phone">{st("phone")}</label>
          </div>
          {message && (
            <p role="alert" className="border border-terracotta/40 bg-terracotta/5 px-[14px] py-[12px] text-[14px] text-terracotta">{message}</p>
          )}
          <button type="submit" disabled={busy} className="btn w-full sm:w-auto">
            {busy && <Loader2 aria-hidden className="h-[16px] w-[16px] animate-spin" />}
            {busy ? st("lookup_checking") : st("lookup_submit")}
          </button>
        </form>
      )}
    </InfoPage>
  );
}

function LookupResult({ order, locale, onAgain }: { order: LookedUp; locale: string; onAgain: () => void }) {
  const { st } = useStoreT();
  const heading = useRef<HTMLHeadingElement>(null);
  // The answer replaces the form, so keyboard and screen reader users are taken straight to it.
  useEffect(() => heading.current?.focus(), []);
  const cod = order.paymentMethod === "COD";
  // Same steps as the order page in the account.
  const step =
    order.status === "CANCELLED" ? -1
      : cod ? (order.status === "DELIVERED" ? 2 : order.status === "DELIVERING" ? 1 : 0)
      : ({ PAID: 1, DELIVERING: 2, DELIVERED: 3 } as Record<string, number>)[order.status] ?? 0;
  const steps = cod
    ? [st("step_ordered"), st("step_delivering"), st("step_delivered")]
    : [st("step_ordered"), st("step_paid"), st("step_delivering"), st("step_delivered")];
  const place = [order.district, order.city].filter(Boolean).join(", ");
  const method = order.paymentMethod === "QPAY" ? st("qpay") : order.paymentMethod === "BANK" ? st("bank") : order.paymentMethod;

  return (
    <div>
      <p className="text-[14px] text-taupe">
        {st("order_n", { n: order.orderNumber })} · {st("placed_on", { date: formatDate(order.createdAt, locale) })}
      </p>
      <h2 ref={heading} tabIndex={-1} className="store-heading mt-[8px] text-[34px] outline-none sm:text-[40px]">{st(`os_${order.status}_t`)}</h2>
      <p className="mt-[6px] text-[15px] text-ink/70">{st(`os_${order.status}_s`)}</p>

      {step >= 0 && (
        <ol className={`mt-[24px] grid gap-[8px] ${cod ? "grid-cols-3" : "grid-cols-4"}`}>
          {steps.map((label, i) => (
            <li key={label} aria-current={i === step ? "step" : undefined}>
              <div className={`h-[2px] ${i <= step ? "bg-ink" : "bg-ink/10"}`} />
              <p className={`mt-[10px] flex items-start gap-[5px] text-[12px] leading-tight sm:text-[13px] ${i <= step ? "text-ink" : "text-ink/60"}`}>
                {i <= step && <Check aria-hidden className="mt-[1px] h-[13px] w-[13px] shrink-0" strokeWidth={1.8} />}
                {label}
              </p>
            </li>
          ))}
        </ol>
      )}

      <ul className="mt-[28px] divide-y divide-ink/10 border-y border-ink/10">
        {order.items.map((item, i) => (
          <li key={`${item.productName}-${i}`} className="flex items-center gap-[14px] py-[14px]">
            <div className="product-media h-[64px] w-[52px] shrink-0">
              {item.image && <img src={imageUrl(item.image, 160)} alt="" className="absolute inset-0 h-full w-full object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium leading-snug text-ink">{item.productName}</p>
              <p className="text-[13px] text-taupe">
                {item.size ? `${item.size} · ` : ""}
                {st("quantity")}: {item.quantity}
              </p>
            </div>
            {item.lineTotal != null && <span className="shrink-0 text-[15px] tabular-nums text-ink">{money(item.lineTotal)}</span>}
          </li>
        ))}
      </ul>

      <dl className="mt-[16px] space-y-[6px] text-[14px]">
        <div className="flex justify-between gap-[16px]">
          <dt className="text-taupe">{st("shipping")}</dt>
          <dd className="tabular-nums">{money(order.deliveryFee)}</dd>
        </div>
        <div className="flex justify-between gap-[16px] text-[16px] font-medium text-ink">
          <dt>{st("total")}</dt>
          <dd className="tabular-nums">{money(order.totalPrice)}</dd>
        </div>
        <div className="flex justify-between gap-[16px]">
          <dt className="text-taupe">{st("payment_method_title")}</dt>
          <dd className="text-right">
            {method} · {order.paymentStatus === "PAID" ? st("lookup_paid") : st("lookup_unpaid")}
          </dd>
        </div>
        {place && (
          <div className="flex justify-between gap-[16px]">
            <dt className="text-taupe">{st("ship_to")}</dt>
            <dd className="text-right">{place}</dd>
          </div>
        )}
      </dl>

      {STORE.contact.phone && (
        <p className="mt-[24px] border-t border-ink/10 pt-[16px] text-[14px] text-ink/70">
          {st("help_call")}{" "}
          <a href={`tel:${STORE.contact.phone}`} className="link-underline text-ink">{STORE.contact.phone}</a>
        </p>
      )}
      <button type="button" onClick={onAgain} className="btn-secondary mt-[20px]">{st("lookup_another")}</button>
    </div>
  );
}
