"use client";

import TermsDialog from "./TermsDialog";
import { CartItem } from "@/type/type";
import { useCheckout } from "./components/useCheckout";
import CheckoutLayout from "./components/CheckoutLayout";

export default function InfoStep({ cart }: { cart: CartItem[] }) {
  const checkout = useCheckout(cart);

  const validateAndSubmit = () => {
    // prevent multi click while creating order
    if (checkout.isSubmitting) return;

    const errors: Record<string, boolean> = {};

    if (!checkout.form.firstName?.trim()) errors.firstName = true;
    if (!checkout.form.lastName?.trim()) errors.lastName = true;
    if (!checkout.form.phonenumber?.trim()) errors.phonenumber = true;
    if (!checkout.form.city?.trim()) errors.city = true;
    if (!checkout.form.district?.trim()) errors.district = true;
    if (!checkout.form.khoroo?.trim()) errors.khoroo = true;
    if (!checkout.form.address?.trim()) errors.address = true;

    checkout.handleSubmit(errors);
  };

  return (
    <>
      <CheckoutLayout
        cart={cart}
        form={checkout.form}
        errors={checkout.errors}
        paymentMethod={checkout.paymentMethod}
        setPaymentMethod={checkout.setPaymentMethod}
        deliveryFee={checkout.deliveryFee}
        setForm={checkout.setForm}
        onSubmit={validateAndSubmit}
        isSubmitting={checkout.isSubmitting} // ✅ IMPORTANT (desktop button lock)
      />

      {/* Terms confirmation */}
      <TermsDialog
        open={checkout.openTerms}
        onOpenChange={checkout.setOpenTerms}
        onConfirm={checkout.handlePaymentStart}
        isLoading={checkout.isSubmitting} // ✅ disable + loading
      />

      {/* Mobile sticky actions */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border px-4 py-3">
        <div className="flex gap-3">
          <button
            onClick={() => checkout.router.back()}
            className="h-[44px] flex-1 rounded-md border"
            disabled={checkout.isSubmitting}
            type="button"
          >
            {checkout.t("back")}
          </button>

          <button
            onClick={validateAndSubmit}
            disabled={checkout.isSubmitting}
            className="h-[44px] flex-1 rounded-md bg-primary text-primary-foreground font-semibold disabled:opacity-60 disabled:pointer-events-none"
            type="button"
          >
            {checkout.isSubmitting ? (
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
                {checkout.t("loading")}
              </span>
            ) : (
              checkout.t("order")
            )}
          </button>
        </div>
      </div>
    </>
  );
}
