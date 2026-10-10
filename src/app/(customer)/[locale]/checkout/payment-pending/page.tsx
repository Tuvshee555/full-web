"use client";

import { Suspense } from "react";
import PaymentPendingInner from "./PaymentPendingInner";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-paper" />}>
      <PaymentPendingInner />
    </Suspense>
  );
}
