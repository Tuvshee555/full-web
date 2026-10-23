"use client";

import type { LegalDocument } from "@/config/legal";
import { LEGAL_UPDATED } from "@/config/store";
import { useStoreT } from "./lib/useStoreT";

/** The text of a Terms / Privacy page: an intro, headed sections, and the date it was last changed. */
export function LegalBody({ doc }: { doc: LegalDocument }) {
  const { st } = useStoreT();
  return (
    <div className="max-w-[640px]">
      <p className="text-[16px] leading-relaxed text-ink/75">{doc.intro}</p>
      {doc.sections.map((section) => (
        <section key={section.heading} className="mt-[36px]">
          <h2 className="store-heading text-[26px] leading-tight">{section.heading}</h2>
          {section.paragraphs?.map((text) => (
            <p key={text} className="mt-[12px] text-[16px] leading-relaxed text-ink/75">{text}</p>
          ))}
          {section.items && (
            <ul className="mt-[12px] list-disc space-y-[10px] pl-[20px] text-[16px] leading-relaxed text-ink/75 marker:text-taupe">
              {section.items.map((text) => <li key={text}>{text}</li>)}
            </ul>
          )}
        </section>
      ))}
      <p className="mt-[40px] border-t border-ink/10 pt-[16px] text-[13px] text-taupe">{st("legal_updated", { date: LEGAL_UPDATED })}</p>
    </div>
  );
}
