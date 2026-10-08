/* eslint-disable @typescript-eslint/no-explicit-any */
// components/PaymentSummary.tsx
"use client";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DELIVERY_FEE } from "@/data/mongoliaLocations";

/* Cart item */
type CartItem = {
  quantity?: number;
  qty?: number;
  price?: number;
  food?: {
    price?: number;
  };
};

const CART_KEY = "cart";

/* MUST MATCH BACKEND ENUM EXACTLY */
export type PaymentMethod = "QPAY" | "BANK" | "LEMON" | null;

interface PaymentSummaryProps {
  cart: CartItem[]; // initial cart (server/prop)
  onSubmit: () => void;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (p: PaymentMethod) => void;
  deliveryFee?: number;
  hideActions?: boolean;
  isSubmitting?: boolean;
}

const PAYMENT_METHODS: {
  value: Exclude<PaymentMethod, null>;
  labelKey: string;
}[] = [
  { value: "QPAY", labelKey: "payment.qpay" },
  { value: "BANK", labelKey: "payment.bank" },
  { value: "LEMON", labelKey: "payment.card" },
];

export default function PaymentSummary({
  cart,
  onSubmit,
  paymentMethod,
  setPaymentMethod,
  deliveryFee = DELIVERY_FEE,
  hideActions = false,
  isSubmitting = false,
}: PaymentSummaryProps) {
  const { locale, t } = useI18n();
  const router = useRouter();

  // ✅ behave like CartStep
  const [items, setItems] = useState<CartItem[]>(cart ?? []);

  // ✅ sync from prop (first load / SSR)
  useEffect(() => {
    setItems(cart ?? []);
  }, [cart]);

  // ✅ listen for cart changes globally (CartStep dispatches "cart-updated")
  useEffect(() => {
    const handler = () => {
      try {
        const raw = localStorage.getItem(CART_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        setItems(Array.isArray(parsed) ? parsed : []);
      } catch {
        setItems([]);
      }
    };

    window.addEventListener("cart-updated", handler);
    return () => window.removeEventListener("cart-updated", handler);
  }, []);

  const productTotal = useMemo(() => {
    return items.reduce((sum, i) => {
      const unitPrice = Number(i.food?.price ?? i.price ?? 0);
      const qty = Number((i as any).quantity ?? (i as any).qty ?? 1);
      return sum + unitPrice * qty;
    }, 0);
  }, [items]);

  const [coupon, setCoupon] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState("");
  const grandTotal = productTotal - couponDiscount + deliveryFee;

  useEffect(() => {
    if (!paymentMethod) setPaymentMethod("QPAY");
  }, [paymentMethod, setPaymentMethod]);

  const handleSubmit = () => {
    if (isSubmitting) return;
    onSubmit();
  };

  const handleCouponCheck = () => {
    const normalized = coupon.trim().toUpperCase();
    if (!normalized) {
      setCouponDiscount(0);
      setCouponMessage(t("coupon_empty", "Купон код оруулна уу."));
      return;
    }

    if (normalized === "NOMAD10") {
      const discount = Math.round(productTotal * 0.1);
      setCouponDiscount(discount);
      setCouponMessage(
        locale === "mn"
          ? `Купон баталгаажлаа. -${discount.toLocaleString()}₮`
          : `Coupon applied. -${discount.toLocaleString()}₮`,
      );
      return;
    }

    setCouponDiscount(0);
    setCouponMessage(
      locale === "mn" ? "Купон код хүчингүй байна." : "Invalid coupon code.",
    );
  };

  return (
    <aside className="w-full lg:w-[400px] bg-card rounded-2xl p-6 space-y-6 h-fit">
      <h2 className="text-base font-semibold border-b border-border pb-3">
        {t("payment_info")}
      </h2>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>{t("product_total")}</span>
          <span>{productTotal.toLocaleString()}₮</span>
        </div>

        <div className="flex justify-between text-muted-foreground">
          <span>{t("delivery_price")}</span>
          <span>{deliveryFee.toLocaleString()}₮</span>
        </div>

        {couponDiscount > 0 && (
          <div className="flex justify-between text-emerald-500">
            <span>{t("coupon_discount", "Купоны хөнгөлөлт")}</span>
            <span>-{couponDiscount.toLocaleString()}₮</span>
          </div>
        )}
      </div>

      <div className="border-t border-border" />

      <div className="flex justify-between items-center font-semibold">
        <span>{t("grand_total")}</span>
        <span className="text-lg">{grandTotal.toLocaleString()}₮</span>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">{t("coupon_placeholder")}</label>
        <div className="flex gap-2">
          <input
            value={coupon}
            onChange={(e) => setCoupon(e.target.value)}
            placeholder={t("coupon_placeholder")}
            className="h-[44px] flex-1 rounded-md border border-border bg-background px-3 text-sm"
          />
          <Button
            type="button"
            variant="outline"
            className="h-[44px]"
            onClick={handleCouponCheck}
          >
            {t("check")}
          </Button>
        </div>
        {couponMessage ? (
          <p
            className={`text-xs ${
              couponDiscount > 0 ? "text-emerald-500" : "text-muted-foreground"
            }`}
          >
            {couponMessage}
          </p>
        ) : null}
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">{t("choose_payment")}</p>

        {PAYMENT_METHODS.map((m) => (
          <label
            key={m.value}
            className={`flex items-center gap-3 h-[44px] px-3 rounded-md border cursor-pointer transition ${
              paymentMethod === m.value
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted"
            }`}
          >
            <input
              type="radio"
              name="payment"
              checked={paymentMethod === m.value}
              onChange={() => setPaymentMethod(m.value)}
              disabled={isSubmitting}
            />
            <span className="text-sm">{t(m.labelKey)}</span>
          </label>
        ))}
      </div>

      {!hideActions && (
        <div className="hidden lg:flex gap-3">
          <Button
            variant="outline"
            className="w-full h-[44px]"
            onClick={() => router.push(`/${locale}/checkout?step=cart`)}
            disabled={isSubmitting}
          >
            {t("back")}
          </Button>

          <Button
            className="w-full h-[44px]"
            onClick={handleSubmit}
            disabled={!paymentMethod || isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray="60"
                  />
                </svg>
                {t("loading")}
              </span>
            ) : (
              t("order")
            )}
          </Button>
        </div>
      )}

      <p className="text-sm text-muted-foreground leading-relaxed">
        {t("delivery_notice")}
      </p>
    </aside>
  );
}
