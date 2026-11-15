"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { brandFor } from "@/config/store";
import { DELIVERY_FEE } from "@/data/mongoliaLocations";
import { API_BASE_URL } from "@/lib/api";
import { InfoPage } from "@/components/store/InfoPage";
import { DevHint } from "@/components/store/ui";
import { money } from "@/components/store/lib/product";
import { useStoreT } from "@/components/store/lib/useStoreT";

type FaqItem = { q: string; a: string };

/** FAQ answered from how the site actually works, the owner's policies, and the questions the owner adds in the admin. */
export default function FAQPage() {
  const { st, locale } = useStoreT();
  const BRAND = brandFor(locale);
  const [open, setOpen] = useState<number | null>(0);
  const [shopFaq, setShopFaq] = useState<FaqItem[]>([]);

  // The same rows the chat assistant answers from (admin → Chat assistant → Knowledge).
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE_URL}/chatbot/public/faq?locale=${locale}`, { signal: AbortSignal.timeout(10_000) })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (!cancelled && Array.isArray(data?.items)) setShopFaq(data.items.filter((item: FaqItem) => item && item.q && item.a)); })
      .catch(() => { /* the built-in questions still show */ });
    return () => { cancelled = true; };
  }, [locale]);

  const items: FaqItem[] = [
    { q: st("faq_fee_q"), a: st("faq_fee_a", { fee: money(DELIVERY_FEE) }) },
    { q: st("faq_pay_q"), a: st("faq_pay_a") },
    { q: st("faq_track_q"), a: st("faq_track_a") },
    { q: st("faq_expire_q"), a: st("faq_expire_a") },
    ...BRAND.faq,
    ...shopFaq,
  ];

  return (
    <InfoPage title={st("faq_title")}>
      <ul className="border-t border-ink/15">
        {items.map((it, i) => {
          const isOpen = open === i;
          return (
            <li key={`${i}-${it.q}`} className="border-b border-ink/10">
              <button type="button" onClick={() => setOpen(isOpen ? null : i)} className="flex w-full items-center justify-between gap-[16px] py-[22px] text-left" aria-expanded={isOpen}>
                <span className="store-heading text-[24px] md:text-[26px]">{it.q}</span>
                <Plus className={`h-[18px] w-[18px] shrink-0 text-ink transition-transform duration-500 ease-silk ${isOpen ? "rotate-45" : ""}`} strokeWidth={1.2} />
              </button>
              {/* Closed answers stay in the page for the animation, but out of reach of screen readers and the keyboard. */}
              <div inert={!isOpen} className={`grid transition-[grid-template-rows,opacity] duration-500 ease-silk ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                <p className="overflow-hidden whitespace-pre-line pb-[22px] text-[16px] leading-relaxed text-ink/70">{it.a}</p>
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
