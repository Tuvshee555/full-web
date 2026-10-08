"use client";

import React from "react";
import { useState } from "react";
import { useI18n } from "@/components/i18n/ClientI18nProvider";

type Props = {
  total: number;
  delivery: number;
  onCheckout: () => void;
  onClear?: () => void;
};

export const CartSummary: React.FC<Props> = ({
  total,
  delivery,
  onCheckout,
  onClear,
}) => {
  const { t, locale } = useI18n();
  const [coupon, setCoupon] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState("");
  const grandTotal = total - couponDiscount + delivery;

  const handleCouponCheck = () => {
    const normalized = coupon.trim().toUpperCase();
    if (!normalized) {
      setCouponDiscount(0);
      setCouponMessage(t("coupon_empty", "Купон код оруулна уу."));
      return;
    }

    if (normalized === "NOMAD10") {
      const discount = Math.round(total * 0.1);
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
    <>
      {/* CARD */}
      <div
        className="
          bg-card rounded-xl space-y-4
          border border-border p-4
          sm:p-6
        "
      >
        <h2 className="text-base font-semibold sm:border-b sm:border-border sm:pb-3">
          {t("payment_info")}
        </h2>

        <div className="flex justify-between text-sm">
          <span>{t("product_total")}</span>
          <span>{total.toLocaleString()}₮</span>
        </div>

        <div className="flex justify-between text-sm">
          <span>{t("delivery_fee")}</span>
          <span>{delivery.toLocaleString()}₮</span>
        </div>

        {couponDiscount > 0 && (
          <div className="flex justify-between text-sm text-emerald-500">
            <span>{t("coupon_discount", "Купоны хөнгөлөлт")}</span>
            <span>-{couponDiscount.toLocaleString()}₮</span>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">{t("coupon_placeholder")}</label>
          <div className="flex gap-2">
            <input
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
              placeholder={t("coupon_placeholder")}
              className="h-[40px] flex-1 rounded-md border border-border bg-background px-3 text-sm"
            />
            <button
              type="button"
              className="h-[40px] rounded-md border border-border px-3 text-sm font-medium hover:bg-muted"
              onClick={handleCouponCheck}
            >
              {t("check")}
            </button>
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

        <div className="pt-4 flex justify-between items-center sm:border-t sm:border-border">
          <span className="text-base font-semibold">{t("grand_total")}</span>
          <span className="text-xl font-semibold">
            {grandTotal.toLocaleString()}₮
          </span>
        </div>

        {/* DESKTOP BUTTON */}
        <button
          onClick={onCheckout}
          className="
    hidden sm:flex
    w-full h-[44px]
    items-center justify-center
    rounded-md
    bg-primary text-primary-foreground
    text-sm font-medium
  "
        >
          {t("continue")}
        </button>

        {onClear && (
          <button
            onClick={onClear}
            className="
    hidden sm:flex
    w-full h-[44px]
    items-center justify-center
    text-sm font-medium
    bg-muted
    text-foreground
    border border-border
    hover:bg-muted/80
  "
          >
            {t("clear_cart")}
          </button>
        )}
      </div>

      {/* ✅ MOBILE STICKY ACTION */}
      <div
        className="
          sm:hidden
          fixed bottom-0 left-0 right-0
          bg-background border-t border-border
          p-4
        "
      >
        <button
          onClick={onCheckout}
          className="
            w-full h-[44px]
            rounded-md
            bg-primary text-primary-foreground
            text-sm font-medium
          "
        >
          {t("continue")}
        </button>
      </div>
    </>
  );
};
