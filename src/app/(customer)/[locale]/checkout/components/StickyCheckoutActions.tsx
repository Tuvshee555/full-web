"use client";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import clsx from "clsx";

type CartItem = {
  quantity: number;
  price?: number;
  food?: { price?: number };
};

type PaymentMethod = "qpay" | "card" | "cod" | null;

interface StickyProps {
  cart: CartItem[];
  delivery?: number;
  paymentMethod: PaymentMethod;
  onBack: () => void;
  onSubmit: () => void;
}

export default function StickyCheckoutActions({
  cart,
  // delivery = 100,
  delivery = 0,

  paymentMethod,
  onBack,
  onSubmit,
}: StickyProps) {
  const { t } = useI18n();

  const total = cart.reduce(
    (sum, i) => sum + (i.food?.price ?? i.price ?? 0) * i.quantity,
    0
  );
  const grandTotal = total + delivery;

  return (
    <>
      {/* Mobile: full-width bottom bar */}
      <div className="fixed bottom-0 left-0 z-[90] w-full md:hidden">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-background border-t border-border p-3 flex items-center gap-3">
            <div className="flex-1">
              <div className="text-sm text-muted-foreground">
                {t("grand_total")}
              </div>
              <div className="font-semibold">
                {grandTotal.toLocaleString()}₮
              </div>
            </div>

            <div className="flex gap-2 w-[260px]">
              <Button
                variant="outline"
                className="w-1/2 h-[44px]"
                onClick={onBack}
              >
                {t("back")}
              </Button>
              <Button
                className="w-1/2 h-[44px]"
                onClick={onSubmit}
                disabled={!paymentMethod}
              >
                {t("order")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop: compact floating card bottom-right */}
      <div className="hidden md:block">
        <div
          className={clsx(
            "fixed z-[90] bottom-6 right-6 bg-card border border-border rounded-2xl shadow-lg p-4 flex items-center gap-4",
            "min-w-[360px] max-w-[420px]"
          )}
        >
          <div className="flex-1">
            <div className="text-xs text-muted-foreground">
              {t("grand_total")}
            </div>
            <div className="font-semibold text-lg">
              {grandTotal.toLocaleString()}₮
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" className="h-[44px]" onClick={onBack}>
              {t("back")}
            </Button>

            <Button
              className="h-[44px]"
              onClick={onSubmit}
              disabled={!paymentMethod}
            >
              {t("order")}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
