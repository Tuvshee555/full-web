"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useI18n } from "@/components/i18n/ClientI18nProvider";

export function HomeFaqSection() {
  const { t } = useI18n();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    { q: t("faq_q1"), a: t("faq_a1") },
    { q: t("faq_q2"), a: t("faq_a2") },
    { q: t("faq_q3"), a: t("faq_a3") },
    { q: t("faq_q4"), a: t("faq_a4") },
    { q: t("faq_q5"), a: t("faq_a5") },
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 py-16">
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight">{t("faq_title")}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t(
            "faq_subtitle",
            "Захиалга, хүргэлт, буцаалтын талаар хамгийн их асуудаг мэдээллүүд.",
          )}
        </p>
      </div>

      <div className="rounded-2xl border border-border divide-y divide-border bg-card">
        {faqs.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div key={index} className="px-5">
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="w-full flex items-center justify-between py-5 text-left"
              >
                <span className="font-medium">{item.q}</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isOpen && (
                <p className="pb-5 text-sm text-muted-foreground leading-relaxed">
                  {item.a}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
