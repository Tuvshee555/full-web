"use client";

import { STORE, brandFor } from "@/config/store";
import { InfoPage } from "@/components/store/InfoPage";
import { DevHint } from "@/components/store/ui";
import { useStoreT } from "@/components/store/lib/useStoreT";

export default function AboutPage() {
  const { st, locale } = useStoreT();
  const brand = brandFor(locale);
  const paragraphs = brand.about.length ? brand.about : [st("about_fallback", { name: STORE.name })];

  return (
    <InfoPage title={st("about_title")}>
      <div className="space-y-[20px]">
        {paragraphs.map((p, i) => (
          <p key={i} className={i === 0 ? "display-italic text-[28px] leading-[1.3] text-ink md:text-[34px]" : "text-[16px] leading-relaxed text-ink/75"}>
            {p}
          </p>
        ))}
        {!brand.about.length && <DevHint>BRAND_COPY.about in src/config/store.ts: your real story, one paragraph per item.</DevHint>}
      </div>
    </InfoPage>
  );
}
