"use client";

import Image from "next/image";
import { useI18n } from "@/components/i18n/ClientI18nProvider";

export default function AboutPage() {
  const { t } = useI18n();

  return (
    <section className="w-full">
      {/* Image section */}
      <div className="flex justify-center">
        <div className="relative w-full max-w-3xl aspect-[4/5]">
          <Image
            src="/about.jpg" // put image in /public/about.jpg
            alt={t("about_title")}
            fill
            className="object-cover rounded-sm"
            priority
          />
        </div>
      </div>

      {/* Text content */}
      <div className="max-w-3xl mx-auto px-6 mt-12 space-y-6 text-[16px] leading-7">
        <p>{t("about_p1")}</p>

        <p>
          {t("about_p2_strong_prefix")} <strong>{t("about_p2_strong")}</strong>{" "}
          {t("about_p2_suffix")}
        </p>

        <p>{t("about_p3")}</p>

        <p className="italic font-medium">✨ {t("about_unique")}</p>

        <p className="font-semibold">{t("about_thanks")} 💜</p>
      </div>
    </section>
  );
}
