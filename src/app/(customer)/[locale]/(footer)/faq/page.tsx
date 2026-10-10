"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { brandFor } from "@/config/store";
import { DELIVERY_FEE } from "@/data/mongoliaLocations";
import { InfoPage } from "@/components/store/InfoPage";
import { DevHint } from "@/components/store/ui";
import { money } from "@/components/store/lib/product";
import { useStoreT } from "@/components/store/lib/useStoreT";

/** FAQ answered from how the site actually works, plus owner-written policies. */
export default function FAQPage() {
  const { st, locale } = useStoreT();
  const BRAND = brandFor(locale);
  const [open, setOpen] = useState<number | null>(0);

  const items = [
    { q: st("faq_fee_q"), a: st("faq_fee_a", { fee: money(DELIVERY_FEE) }) },
    { q: st("faq_pay_q"), a: st("faq_pay_a") },
    { q: st("faq_track_q"), a: st("faq_track_a") },
    { q: st("faq_expire_q"), a: st("faq_expire_a") },
    ...BRAND.faq,
  ];

  return (
    <InfoPage title={st("faq_title")}>
      <ul className="border-t border-ink/15">
        {items.map((it, i) => {
          const isOpen = open === i;
          return (
            <li key={it.q} className="border-b border-ink/10">
              <button type="button" onClick={() => setOpen(isOpen ? null : i)} className="flex w-full items-center justify-between gap-[16px] py-[22px] text-left" aria-expanded={isOpen}>
                <span className="store-heading text-[24px] md:text-[26px]">{it.q}</span>
                <Plus className={`h-[18px] w-[18px] shrink-0 text-ink transition-transform duration-500 ease-silk ${isOpen ? "rotate-45" : ""}`} strokeWidth={1.2} />
              </button>
              <div className={`grid transition-[grid-template-rows,opacity] duration-500 ease-silk ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                <p className="overflow-hidden pb-[22px] text-[16px] leading-relaxed text-ink/70">{it.a}</p>
              </div>
            </li>
          );
        })}
      </ul>
      {!BRAND.faq.length && (
        <div className="mt-[20px]">
          <DevHint>BRAND_COPY.faq in src/config/store.ts: add your own policies (delivery days, returns). Only what you will actually honour.</DevHint>
        </div>
      )}
    </InfoPage>
  );
}
