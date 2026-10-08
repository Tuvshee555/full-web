"use client";

import { useState } from "react";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import { ChevronDown } from "lucide-react";

type FAQItem = {
  question: string;
  answer: string;
};

export default function FAQPage() {
  const { t } = useI18n();
  const [openIndex, setOpenIndex] = useState<number | null>(0); // first open looks better

  const faqs: FAQItem[] = [
    { question: t("faq_q1"), answer: t("faq_a1") },
    { question: t("faq_q2"), answer: t("faq_a2") },
    { question: t("faq_q3"), answer: t("faq_a3") },
    { question: t("faq_q4"), answer: t("faq_a4") },
    { question: t("faq_q5"), answer: t("faq_a5") },
  ];

  return (
    <section className="max-w-4xl mx-auto px-6 py-20">
      {/* Header */}
      <div className="text-center mb-14">
        <h1 className="text-3xl font-bold mb-3">{t("faq_title")}</h1>
        <p className="text-gray-500">{t("faq_subtitle")}</p>
      </div>

      {/* FAQ */}
      <div className="divide-y rounded-xl border bg-white shadow-sm">
        {faqs.map((item, index) => {
          const isOpen = openIndex === index;

          return (
            <div key={index} className="px-6">
              <button
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="w-full flex items-center justify-between py-6 text-left group"
              >
                <span
                  className={`text-base font-medium transition-colors ${
                    isOpen ? "text-black" : "text-gray-700"
                  }`}
                >
                  {item.question}
                </span>

                <ChevronDown
                  size={20}
                  className={`shrink-0 transition-transform duration-300 ${
                    isOpen ? "rotate-180 text-black" : "text-gray-400"
                  }`}
                />
              </button>

              {/* Answer */}
              <div
                className={`grid transition-all duration-300 ease-in-out ${
                  isOpen
                    ? "grid-rows-[1fr] opacity-100 pb-6"
                    : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden text-gray-600 leading-relaxed">
                  {item.answer}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
