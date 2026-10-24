"use client";

import { DELIVERY_FEE } from "@/data/mongoliaLocations";
import { money } from "./lib/product";
import { useStoreT } from "./lib/useStoreT";

/** Both cart surfaces disclose the same configured fee before checkout. */
export function CartTotals({ subtotal }: { subtotal: number }) {
  const { st } = useStoreT();
  return (
    <dl className="space-y-3 text-sm tabular-nums">
      <div className="flex justify-between gap-4">
        <dt className="text-taupe">{st("subtotal")}</dt>
        <dd>{money(subtotal)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-taupe">{st("delivery")}</dt>
        <dd>{money(DELIVERY_FEE)}</dd>
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-t border-ink/15 pt-4 text-ink">
        <dt className="font-medium">{st("estimated_total")}</dt>
        <dd className="text-2xl font-medium">
          {money(subtotal + DELIVERY_FEE)}
        </dd>
      </div>
    </dl>
  );
}
