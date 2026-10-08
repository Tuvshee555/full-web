/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ChevronDown, Loader2, ShoppingBag } from "lucide-react";
import { STORE, SHOPIFY_BLUE } from "@/config/store";
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

  if (!ready) return <div className="min-h-screen" />;

  if (!items.length) {
    return (
      <div className="flex min-h-screen flex-col">
        <CheckoutHeader />
        <div className="flex flex-1 flex-col items-center justify-center gap-[24px] px-[20px] text-center">
          <h1 className="text-[24px] text-[#121212]">{st("cart_empty")}</h1>
          <Link href={collectionUrl(locale)} className="btn">
            {st("continue_shopping")}
          </Link>
        </div>
      </div>
    );
  }

  return <Checkout items={items} />;
}

function CheckoutHeader() {
  const { locale, st } = useStoreT();
  return (
    <header className="border-b border-[#dedede] bg-white">
      {/* Same two-half grid as the page so the logo lines up with the form */}
      <div className="flex h-[64px] lg:h-[80px] items-center">
        <div className="flex flex-1 lg:justify-end">
          <div className="flex w-full max-w-[640px] items-center justify-between px-[20px] lg:px-[38px] mx-auto lg:mx-0">
            <Link href={`/${locale}`} className="text-[22px] text-[#121212]">
              {STORE.name}
            </Link>
            <Link href={`/${locale}/cart`} aria-label={st("cart")} style={{ color: SHOPIFY_BLUE }}>
              <ShoppingBag className="h-[22px] w-[22px]" strokeWidth={1.5} />
            </Link>
          </div>
        </div>
        <div className="hidden lg:block lg:flex-1" />
      </div>
    </header>
  );
}

function Checkout({ items }: { items: StoreCartItem[] }) {
  const { st } = useStoreT();
  const { token } = useAuth();
  const authDialog = useAuthDialog();
  const c = useCheckout(items);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const isGuest = typeof window !== "undefined" && localStorage.getItem("guest") === "true";

  const set = (k: keyof DeliveryFormData, v: string) => c.setForm((f) => ({ ...f, [k]: v }));
  const zone = c.form.deliveryZone ?? "UB";
  const districts = zone === "UB" ? ULAANBAATAR_DISTRICTS : (AIMAG_DISTRICTS[c.form.city ?? ""] ?? []);

  return (
    <div className="min-h-screen bg-white text-[14px] text-[#121212] tracking-normal" style={{ fontFamily: "var(--font-store), system-ui, sans-serif" }}>
      <CheckoutHeader />

      {/* Mobile summary toggle */}
      <button
        type="button"
        onClick={() => setSummaryOpen((v) => !v)}
        className="flex w-full items-center justify-between border-b border-[#dedede] bg-[#f5f5f5] px-[20px] py-[16px] lg:hidden"
      >
        <span className="flex items-center gap-[6px]" style={{ color: SHOPIFY_BLUE }}>
          {summaryOpen ? st("hide_summary") : st("show_summary")}
          <ChevronDown className={`h-[14px] w-[14px] transition-transform ${summaryOpen ? "rotate-180" : ""}`} />
        </span>
        <span className="text-[17px] font-semibold">{money(c.total)}</span>
      </button>
      {summaryOpen && (
        <div className="border-b border-[#dedede] bg-[#f5f5f5] px-[20px] py-[20px] lg:hidden">
          <Summary items={items} c={c} />
        </div>
      )}

      <div className="lg:flex lg:min-h-[calc(100vh-80px)]">
        {/* Form column */}
        <div className="lg:flex lg:flex-1 lg:justify-end lg:border-r lg:border-[#dedede]">
          <div className="w-full max-w-[640px] px-[20px] py-[24px] lg:px-[38px] lg:py-[38px] mx-auto lg:mx-0">
            <Section
              title={st("contact_section")}
              aside={
                !token || isGuest ? (
                  <button type="button" onClick={authDialog.open} className="text-[14px] underline underline-offset-[3px]" style={{ color: SHOPIFY_BLUE }}>
                    {st("log_in")}
                  </button>
                ) : null
              }
            >
              <Field name="phonenumber" label={st("phone")} value={c.form.phonenumber} onChange={set} error={c.errors.phonenumber} inputMode="tel" autoComplete="tel" />
            </Section>

            <Section title={st("delivery")}>
              <div className="space-y-[12px]">
                <SelectField
                  name="deliveryZone"
                  label={st("zone")}
                  value={zone}
                  onChange={(_, v) =>
                    c.setForm((f) => ({
                      ...f,
                      deliveryZone: v as "UB" | "RURAL",
                      city: v === "UB" ? "Улаанбаатар" : "",
                      district: v === "UB" ? ULAANBAATAR_DISTRICTS[0] : "",
                    }))
                  }
                  options={[
                    ["UB", st("zone_ub")],
                    ["RURAL", st("zone_rural")],
                  ]}
                />
                <div className="grid grid-cols-2 gap-[12px]">
                  <Field name="firstName" label={st("first_name")} value={c.form.firstName} onChange={set} error={c.errors.firstName} autoComplete="given-name" />
                  <Field name="lastName" label={st("last_name")} value={c.form.lastName} onChange={set} error={c.errors.lastName} autoComplete="family-name" />
                </div>
                <div className="grid grid-cols-2 gap-[12px]">
                  {zone === "RURAL" ? (
                    <SelectField
                      name="city"
                      label={st("aimag")}
                      value={c.form.city ?? ""}
                      onChange={(_, v) => c.setForm((f) => ({ ...f, city: v, district: "" }))}
                      options={[["", ""], ...AIMAGS.map((a) => [a, a] as [string, string])]}
                      error={c.errors.city}
                    />
                  ) : null}
                  <SelectField
                    name="district"
                    label={zone === "UB" ? st("district") : st("soum")}
                    value={c.form.district ?? ""}
                    onChange={set}
                    options={[["", ""], ...districts.map((d) => [d, d] as [string, string])]}
                    error={c.errors.district}
                    className={zone === "UB" ? "col-span-1" : ""}
                  />
                  <div className={zone === "UB" ? "" : "col-span-2"}>
                    <Field name="khoroo" label={st("khoroo")} value={c.form.khoroo} onChange={set} error={c.errors.khoroo} />
                  </div>
                </div>
                <Field name="address" label={st("address")} value={c.form.address} onChange={set} error={c.errors.address} autoComplete="street-address" />
                <Field name="notes" label={st("notes")} value={c.form.notes} onChange={set} />
              </div>
            </Section>

            <Section title={st("shipping_method")}>
              <div className="flex items-center justify-between rounded-[5px] border px-[16px] py-[16px]" style={{ borderColor: SHOPIFY_BLUE, background: "#f0f5fa" }}>
                <span>{st("standard_delivery")}</span>
                <span className="font-semibold">{money(c.deliveryFee)}</span>
              </div>
            </Section>

            <Section title={st("payment")} sub={st("payment_sub")}>
              <div className="overflow-hidden rounded-[5px] border border-[#dedede]">
                {(
                  [
                    ["QPAY", st("qpay"), st("qpay_desc")],
                    ["BANK", st("bank"), st("bank_desc")],
                  ] as [PaymentMethod, string, string][]
                ).map(([value, label, desc], i) => {
                  const active = c.paymentMethod === value;
                  return (
                    <div key={value} className={i > 0 ? "border-t border-[#dedede]" : ""}>
                      <label
                        className="flex cursor-pointer items-center gap-[12px] px-[16px] py-[16px]"
                        style={active ? { background: "#f0f5fa", boxShadow: `inset 0 0 0 1px ${SHOPIFY_BLUE}` } : undefined}
                      >
                        <input
                          type="radio"
                          name="payment"
                          checked={active}
                          onChange={() => c.setPaymentMethod(value)}
                          className="h-[18px] w-[18px]"
                          style={{ accentColor: SHOPIFY_BLUE }}
                        />
                        <span className="flex-1">{label}</span>
                      </label>
                      {active && <div className="border-t border-[#dedede] bg-[#f5f5f5] px-[16px] py-[18px] text-center text-[13px] text-[#545454]">{desc}</div>}
                    </div>
                  );
                })}
              </div>
            </Section>

            {c.submitError && <p className="mb-[12px] rounded-[5px] border border-[#d72c0d] bg-[#fff4f4] px-[14px] py-[12px] text-[#d72c0d]">{c.submitError}</p>}

            <button
              type="button"
              onClick={c.placeOrder}
              disabled={c.submitting}
              className="flex h-[56px] w-full items-center justify-center gap-[8px] rounded-[5px] text-[17px] font-semibold text-white transition-opacity disabled:opacity-70"
              style={{ background: SHOPIFY_BLUE }}
            >
              {c.submitting ? (
                <>
                  <Loader2 className="h-[18px] w-[18px] animate-spin" /> {st("processing")}
                </>
              ) : (
                st("pay_now")
              )}
            </button>
            <p className="mt-[14px] text-[12px] text-[#707070]">
              {st("terms_note")}{" "}
              <button type="button" onClick={() => setTermsOpen(true)} className="underline underline-offset-[2px]" style={{ color: SHOPIFY_BLUE }}>
                {st("terms")}
              </button>
            </p>
          </div>
        </div>

        {/* Summary column */}
        <aside className="hidden bg-[#f5f5f5] lg:block lg:flex-1">
          <div className="sticky top-0 max-w-[520px] px-[38px] py-[38px]">
            <Summary items={items} c={c} />
          </div>
        </aside>
      </div>

      <TermsDialog open={termsOpen} onOpenChange={setTermsOpen} onConfirm={() => setTermsOpen(false)} />
    </div>
  );
}

function Summary({ items, c }: { items: StoreCartItem[]; c: ReturnType<typeof useCheckout> }) {
  const { st } = useStoreT();
  return (
    <div>
      <ul className="space-y-[14px]">
        {items.map((i) => (
          <li key={`${i.foodId}-${i.selectedSize ?? ""}`} className="flex items-center gap-[14px]">
            <div className="relative h-[64px] w-[64px] shrink-0 rounded-[8px] border border-[#dedede] bg-white">
              {i.food?.image ? <img src={i.food.image} alt="" className="h-full w-full rounded-[8px] object-cover" /> : null}
              <span className="absolute -right-[8px] -top-[8px] flex h-[21px] min-w-[21px] items-center justify-center rounded-full bg-[#666] px-[6px] text-[12px] text-white">
                {i.quantity}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate">{i.food?.foodName}</p>
              {i.selectedSize && <p className="text-[12px] text-[#707070]">{i.selectedSize}</p>}
            </div>
            <span>{money(Number(i.food?.price ?? 0) * i.quantity)}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-[24px] space-y-[8px]">
        <div className="flex justify-between">
          <dt>{st("subtotal")}</dt>
          <dd>{money(c.productTotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>{st("shipping")}</dt>
          <dd>{money(c.deliveryFee)}</dd>
        </div>
        <div className="flex items-baseline justify-between pt-[10px] text-[19px] font-semibold">
          <dt>{st("total")}</dt>
          <dd>
            <span className="mr-[8px] text-[12px] font-normal text-[#707070]">MNT</span>
            {money(c.total)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function Section({ title, sub, aside, children }: { title: string; sub?: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-[32px]">
      <div className="mb-[12px] flex items-center justify-between">
        <h2 className="text-[21px] font-semibold">{title}</h2>
        {aside}
      </div>
      {sub && <p className="-mt-[6px] mb-[12px] text-[13px] text-[#707070]">{sub}</p>}
      {children}
    </section>
  );
}

const inputBase =
  "peer h-[52px] w-full rounded-[5px] border bg-white px-[12px] pt-[18px] pb-[4px] text-[14px] outline-none transition-[box-shadow,border-color] focus:shadow-[0_0_0_1px_#1773b0] focus:border-[#1773b0]";

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
          className={`${inputBase} ${error ? "border-[#d72c0d]" : "border-[#dedede]"}`}
        />
        <label
          htmlFor={id}
          className="pointer-events-none absolute left-[12px] top-[16px] text-[14px] text-[#707070] transition-all peer-focus:top-[6px] peer-focus:text-[11px] peer-[:not(:placeholder-shown)]:top-[6px] peer-[:not(:placeholder-shown)]:text-[11px]"
        >
          {label}
        </label>
      </div>
      {error && <p className="mt-[6px] text-[12px] text-[#d72c0d]">{error}</p>}
    </div>
  );
}

function SelectField({
  name,
  label,
  value,
  onChange,
  options,
  error,
  className = "",
}: {
  name: keyof DeliveryFormData;
  label: string;
  value: string;
  onChange: (k: keyof DeliveryFormData, v: string) => void;
  options: [string, string][];
  error?: string;
  className?: string;
}) {
  const id = `co-${name}`;
  return (
    <div data-field={name} className={className}>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          className={`${inputBase} appearance-none pr-[32px] ${error ? "border-[#d72c0d]" : "border-[#dedede]"}`}
        >
          {options.map(([v, l]) => (
            <option key={v || "empty"} value={v}>
              {l}
            </option>
          ))}
        </select>
        <label htmlFor={id} className="pointer-events-none absolute left-[12px] top-[6px] text-[11px] text-[#707070]">
          {label}
        </label>
        <ChevronDown className="pointer-events-none absolute right-[12px] top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-[#707070]" />
      </div>
      {error && <p className="mt-[6px] text-[12px] text-[#d72c0d]">{error}</p>}
    </div>
  );
}
