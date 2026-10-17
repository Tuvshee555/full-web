/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ArrowLeft, ChevronDown, Loader2, Lock, ShoppingBag } from "lucide-react";
import { STORE } from "@/config/store";
import { AIMAG_DISTRICTS, AIMAGS, ULAANBAATAR_DISTRICTS } from "@/data/mongoliaLocations";
import { useAuth } from "../provider/AuthProvider";
import { useStoreCart } from "@/components/store/lib/useCart";
import { collectionUrl, money } from "@/components/store/lib/product";
import { useStoreT } from "@/components/store/lib/useStoreT";
import { useAuthDialog } from "@/components/header/email/components/AuthDialogProvider";
import type { StoreCartItem } from "@/components/store/lib/cart";
import TermsDialog from "./components/TermsDialog";
import { useCheckout, type DeliveryFormData, type PaymentMethod } from "./components/components/useCheckout";

export default function CheckoutPage() {
  const { st, locale } = useStoreT();
  const { items, ready } = useStoreCart();

  if (!ready) return <div className="min-h-screen bg-paper" />;

  if (!items.length) {
    return (
      <div className="flex min-h-screen flex-col bg-paper text-ink">
        <CheckoutHeader />
        <div className="flex flex-1 flex-col items-center justify-center gap-[24px] px-[20px] text-center">
          <h1 className="store-heading text-[40px]">{st("cart_empty")}</h1>
          <Link href={collectionUrl(locale)} className="btn">
            {st("continue_shopping")}
          </Link>
        </div>
      </div>
    );
  }

  return <Checkout items={items} />;
}

/** Same header as the order status pages: serif wordmark over the form column. */
function CheckoutHeader() {
  const { locale, st } = useStoreT();
  return (
    <header className="border-b border-ink/10 bg-paper">
      <div className="flex h-[64px] items-center lg:h-[84px]">
        <div className="flex flex-1 lg:justify-end">
          <div className="mx-auto flex w-full max-w-[640px] items-center justify-between px-[20px] lg:mx-0 lg:px-[40px]">
            <Link href={`/${locale}`} className="store-heading py-[10px] text-[26px] lg:text-[30px]">
              {STORE.name}
            </Link>
            <Link
              href={`/${locale}/cart`}
              aria-label={st("cart")}
              className="flex h-[44px] w-[44px] items-center justify-center text-ink/70 transition-colors hover:text-ink lg:hidden"
            >
              <ShoppingBag className="h-[21px] w-[21px]" strokeWidth={1.3} />
            </Link>
          </div>
        </div>
        <div className="hidden lg:block lg:flex-1" />
      </div>
    </header>
  );
}

function Checkout({ items }: { items: StoreCartItem[] }) {
  const { st, locale } = useStoreT();
  const { token } = useAuth();
  const authDialog = useAuthDialog();
  const c = useCheckout(items);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const isGuest = typeof window !== "undefined" && localStorage.getItem("guest") === "true";

  const set = (k: keyof DeliveryFormData, v: string) => c.setForm((f) => ({ ...f, [k]: v }));
  const zone = c.form.deliveryZone ?? "UB";
  const districts = zone === "UB" ? ULAANBAATAR_DISTRICTS : (AIMAG_DISTRICTS[c.form.city ?? ""] ?? []);
  const setZone = (v: "UB" | "RURAL") =>
    c.setForm((f) => ({ ...f, deliveryZone: v, city: v === "UB" ? "Улаанбаатар" : "", district: "" }));

  const payments: [PaymentMethod, string, string][] = [
    ["QPAY", st("qpay"), st("qpay_short")],
    ["BANK", st("bank"), st("bank_short")],
  ];

  return (
    <div className="min-h-screen bg-paper text-[14px] text-ink">
      <CheckoutHeader />

      {/* Mobile: collapsible order summary */}
      <button
        type="button"
        onClick={() => setSummaryOpen((v) => !v)}
        aria-expanded={summaryOpen}
        className="flex w-full items-center justify-between border-b border-ink/10 bg-sand px-[20px] py-[16px] lg:hidden"
      >
        <span className="flex items-center gap-[6px] text-[14px]">
          {summaryOpen ? st("hide_summary") : st("show_summary")}
          <ChevronDown className={`h-[14px] w-[14px] transition-transform duration-500 ease-silk ${summaryOpen ? "rotate-180" : ""}`} strokeWidth={1.4} />
        </span>
        <span className="text-[17px] font-medium">{money(c.total)}</span>
      </button>
      {summaryOpen && (
        <div className="border-b border-ink/10 bg-sand px-[20px] py-[22px] lg:hidden">
          <Summary items={items} c={c} />
        </div>
      )}

      <div className="lg:flex lg:min-h-[calc(100vh-84px)]">
        {/* Form column */}
        <div className="lg:flex lg:flex-1 lg:justify-end lg:border-r lg:border-ink/10">
          <div className="mx-auto w-full max-w-[640px] px-[20px] py-[28px] lg:mx-0 lg:px-[40px] lg:py-[44px]">
            <Link
              href={`/${locale}/cart`}
              className="group mb-[28px] hidden items-center gap-[8px] text-[13px] text-ink/60 hover:text-ink lg:inline-flex"
            >
              <ArrowLeft className="h-[14px] w-[14px] transition-transform duration-500 ease-silk group-hover:-translate-x-[3px]" strokeWidth={1.3} />
              {st("back_to_cart")}
            </Link>

            <Section
              n={1}
              title={st("contact_section")}
              aside={
                !token || isGuest ? (
                  <button type="button" onClick={authDialog.open} className="link-underline inline-flex min-h-[44px] items-center text-[13px] text-ink/70 hover:text-ink">
                    {st("have_account")}
                  </button>
                ) : null
              }
            >
              <Field name="phonenumber" label={st("phone")} value={c.form.phonenumber} onChange={set} error={c.errors.phonenumber} inputMode="tel" autoComplete="tel" />
              {!c.errors.phonenumber && <p className="mt-[8px] text-[12px] text-taupe">{st("phone_hint")}</p>}
            </Section>

            <Section n={2} title={st("delivery")} sub={st("delivery_fee_note", { fee: money(c.deliveryFee) })}>
              <div className="space-y-[12px]">
                {/* Zone: two clear choices instead of a dropdown */}
                <div className="grid grid-cols-2 gap-[8px]" role="radiogroup" aria-label={st("zone")}>
                  {(
                    [
                      ["UB", st("zone_ub")],
                      ["RURAL", st("zone_rural")],
                    ] as ["UB" | "RURAL", string][]
                  ).map(([v, label]) => (
                    <button
                      key={v}
                      type="button"
                      role="radio"
                      aria-checked={zone === v}
                      onClick={() => setZone(v)}
                      className={`h-[48px] text-[14px] transition-colors ${
                        zone === v ? "bg-ink text-paper" : "bg-white text-ink shadow-[inset_0_0_0_1px_rgba(28,23,20,0.18)] hover:shadow-[inset_0_0_0_1px_rgba(28,23,20,0.5)]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-[12px]">
                  <Field name="lastName" label={st("last_name")} value={c.form.lastName} onChange={set} error={c.errors.lastName} autoComplete="family-name" />
                  <Field name="firstName" label={st("first_name")} value={c.form.firstName} onChange={set} error={c.errors.firstName} autoComplete="given-name" />
                </div>

                {zone === "RURAL" && (
                  <SelectField
                    name="city"
                    label={st("aimag")}
                    value={c.form.city ?? ""}
                    onChange={(_, v) => c.setForm((f) => ({ ...f, city: v, district: "" }))}
                    placeholder={st("choose")}
                    options={AIMAGS.map((a) => [a, a] as [string, string])}
                    error={c.errors.city}
                  />
                )}
                <div className="grid grid-cols-2 gap-[12px]">
                  <SelectField
                    name="district"
                    label={zone === "UB" ? st("district") : st("soum")}
                    value={c.form.district ?? ""}
                    onChange={set}
                    placeholder={st("choose")}
                    options={districts.map((d) => [d, d] as [string, string])}
                    error={c.errors.district}
                  />
                  <Field name="khoroo" label={st("khoroo")} value={c.form.khoroo} onChange={set} error={c.errors.khoroo} />
                </div>
                <Field name="address" label={st("address")} value={c.form.address} onChange={set} error={c.errors.address} autoComplete="street-address" />
                <Field name="notes" label={st("notes")} value={c.form.notes} onChange={set} />
              </div>
            </Section>

            <Section n={3} title={st("payment")}>
              <div className="grid gap-[8px] sm:grid-cols-2" role="radiogroup" aria-label={st("payment")}>
                {payments.map(([value, label, desc]) => {
                  const active = c.paymentMethod === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => c.setPaymentMethod(value)}
                      className={`flex items-start gap-[12px] px-[16px] py-[16px] text-left transition-colors ${
                        active ? "bg-sand shadow-[inset_0_0_0_1.5px_#1c1714]" : "bg-white shadow-[inset_0_0_0_1px_rgba(28,23,20,0.18)] hover:shadow-[inset_0_0_0_1px_rgba(28,23,20,0.5)]"
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`mt-[2px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border ${active ? "border-ink" : "border-ink/30"}`}
                      >
                        {active && <span className="h-[8px] w-[8px] rounded-full bg-ink" />}
                      </span>
                      <span>
                        <span className="block text-[15px] font-medium">{label}</span>
                        <span className="mt-[3px] block text-[13px] leading-snug text-taupe">{desc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-[10px] text-[12px] text-taupe">{c.paymentMethod === "QPAY" ? st("qpay_desc") : st("bank_desc")}</p>
            </Section>

            {c.submitError && (
              <p className="mb-[14px] border border-terracotta/40 bg-terracotta/5 px-[14px] py-[12px] text-[14px] text-terracotta">{c.submitError}</p>
            )}

            <button type="button" onClick={c.placeOrder} disabled={c.submitting} className="btn h-[56px] w-full text-[15px]">
              {c.submitting ? (
                <>
                  <Loader2 className="h-[18px] w-[18px] animate-spin" /> {st("processing")}
                </>
              ) : (
                <>
                  <Lock className="h-[15px] w-[15px]" strokeWidth={1.5} />
                  {st("pay_now")}
                  <span className="hidden sm:inline">· {money(c.total)}</span>
                </>
              )}
            </button>
            <p className="mt-[14px] text-center text-[12px] text-taupe">
              {st("terms_note")}{" "}
              <button type="button" onClick={() => setTermsOpen(true)} className="underline underline-offset-[2px] hover:text-ink">
                {st("terms")}
              </button>
            </p>
          </div>
        </div>

        {/* Summary column */}
        <aside className="hidden bg-sand lg:block lg:flex-1">
          <div className="sticky top-0 max-w-[520px] px-[40px] py-[48px]">
            <Summary items={items} c={c} />
          </div>
        </aside>
      </div>

      <TermsDialog open={termsOpen} onOpenChange={setTermsOpen} onConfirm={() => setTermsOpen(false)} />
    </div>
  );
}

function Summary({ items, c }: { items: StoreCartItem[]; c: ReturnType<typeof useCheckout> }) {
  const { st, locale } = useStoreT();
  return (
    <div className="text-[14px]">
      <div className="mb-[18px] flex items-baseline justify-between">
        <h2 className="store-heading text-[24px]">{st("order_summary")}</h2>
        <Link href={`/${locale}/cart`} className="link-underline text-[13px] text-ink/70 hover:text-ink">
          {st("edit_cart")}
        </Link>
      </div>
      <ul className="space-y-[16px]">
        {items.map((i) => (
          <li key={`${i.foodId}-${i.selectedSize ?? ""}`} className="flex items-center gap-[14px]">
            <div className="relative h-[64px] w-[64px] shrink-0 bg-paper">
              {i.food?.image ? <img src={i.food.image} alt="" className="h-full w-full object-cover" /> : null}
              <span className="absolute -right-[8px] -top-[8px] flex h-[20px] min-w-[20px] items-center justify-center rounded-full bg-ink px-[5px] text-[11px] text-paper">
                {i.quantity}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{i.food?.foodName}</p>
              {i.selectedSize && <p className="text-[12px] text-taupe">{i.selectedSize}</p>}
            </div>
            <span className="tabular-nums">{money(Number(i.food?.price ?? 0) * i.quantity)}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-[24px] space-y-[8px] border-t border-ink/10 pt-[18px]">
        <div className="flex justify-between">
          <dt className="text-ink/70">{st("subtotal")}</dt>
          <dd className="tabular-nums">{money(c.productTotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink/70">{st("shipping")}</dt>
          <dd className="tabular-nums">{money(c.deliveryFee)}</dd>
        </div>
        <div className="flex items-baseline justify-between pt-[10px]">
          <dt className="store-heading text-[24px]">{st("total")}</dt>
          <dd className="text-[19px] font-medium tabular-nums">
            <span className="mr-[8px] text-[11px] font-normal text-taupe">MNT</span>
            {money(c.total)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function Section({ n, title, sub, aside, children }: { n: number; title: string; sub?: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-[36px]">
      <div className="mb-[14px] flex items-center justify-between gap-[12px]">
        <h2 className="flex items-center gap-[12px]">
          <span className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full text-[12px] text-ink/60 ring-1 ring-ink/25">
            {n}
          </span>
          <span className="store-heading text-[26px]">{title}</span>
        </h2>
        {aside}
      </div>
      {sub && <p className="-mt-[8px] mb-[14px] text-[13px] text-taupe">{sub}</p>}
      {children}
    </section>
  );
}

const inputBase =
  "peer h-[52px] w-full bg-white px-[14px] pt-[18px] pb-[4px] text-[14px] text-ink outline-none transition-[box-shadow] focus:shadow-[inset_0_0_0_1.5px_#1c1714]";
const ring = (error?: string) =>
  error ? "shadow-[inset_0_0_0_1.5px_#a8452f]" : "shadow-[inset_0_0_0_1px_rgba(28,23,20,0.18)]";

function Field({
  name,
  label,
  value,
  onChange,
  error,
  inputMode,
  autoComplete,
}: {
  name: keyof DeliveryFormData;
  label: string;
  value?: string;
  onChange: (k: keyof DeliveryFormData, v: string) => void;
  error?: string;
  inputMode?: "tel" | "text";
  autoComplete?: string;
}) {
  const id = `co-${name}`;
  return (
    <div data-field={name}>
      <div className="relative">
        <input
          id={id}
          placeholder=" "
          value={value ?? ""}
          onChange={(e) => onChange(name, e.target.value)}
          inputMode={inputMode}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          className={`${inputBase} ${ring(error)}`}
        />
        <label
          htmlFor={id}
          className="pointer-events-none absolute left-[14px] top-[16px] text-[14px] text-taupe transition-all peer-focus:top-[6px] peer-focus:text-[11px] peer-[:not(:placeholder-shown)]:top-[6px] peer-[:not(:placeholder-shown)]:text-[11px]"
        >
          {label}
        </label>
      </div>
      {error && <p className="mt-[6px] text-[12px] text-terracotta">{error}</p>}
    </div>
  );
}

function SelectField({
  name,
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
}: {
  name: keyof DeliveryFormData;
  label: string;
  value: string;
  onChange: (k: keyof DeliveryFormData, v: string) => void;
  options: [string, string][];
  placeholder: string;
  error?: string;
}) {
  const id = `co-${name}`;
  return (
    <div data-field={name}>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          aria-invalid={Boolean(error)}
          className={`${inputBase} ${ring(error)} cursor-pointer appearance-none pr-[34px] ${value ? "" : "text-taupe"}`}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map(([v, l]) => (
            <option key={v} value={v} className="text-ink">
              {l}
            </option>
          ))}
        </select>
        <label htmlFor={id} className="pointer-events-none absolute left-[14px] top-[6px] text-[11px] text-taupe">
          {label}
        </label>
        <ChevronDown className="pointer-events-none absolute right-[12px] top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-taupe" strokeWidth={1.4} />
      </div>
      {error && <p className="mt-[6px] text-[12px] text-terracotta">{error}</p>}
    </div>
  );
}
