/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { motion } from "framer-motion";
import PaymentSummary from "../PaymentSummary";
import DeliveryForm from "../DeliveryForm";

export default function CheckoutLayout({
  cart,
  form,
  errors,
  paymentMethod,
  setPaymentMethod,
  deliveryFee,
  onSubmit,
  setForm,
  isSubmitting, // ✅ NEW
}: any) {
  return (
    <main className="min-h-screen bg-background text-foreground pb-[110px] md:pb-[60px]">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-0 lg:gap-10">
        {/* Delivery FIRST on mobile */}
        <motion.section
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          className="order-1 lg:order-2 flex-1"
        >
          <DeliveryForm form={form} setForm={setForm} errors={errors} />
        </motion.section>

        {/* Payment SECOND on mobile */}
        <motion.section
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          className="order-2 lg:order-1"
        >
          <PaymentSummary
            cart={cart}
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            deliveryFee={deliveryFee}
            onSubmit={onSubmit}
            isSubmitting={isSubmitting} // ✅ PASS IT HERE
          />
        </motion.section>
      </div>
    </main>
  );
}
