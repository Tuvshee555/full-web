"use client";

import { Suspense } from "react";
import PaymentPendingInner from "./PaymentPendingInner";

export default function Page() {
  return (
    <Suspense fallback={<p className="text-white p-10">Түр хүлээнэ үү...</p>}>
      <PaymentPendingInner />
    </Suspense>
  );
}
