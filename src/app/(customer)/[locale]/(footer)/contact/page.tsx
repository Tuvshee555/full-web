"use client";

import { ArrowUpRight } from "lucide-react";
import { STORE } from "@/config/store";
import { InfoPage } from "@/components/store/InfoPage";
import { DevHint } from "@/components/store/ui";
import { useStoreT } from "@/components/store/lib/useStoreT";

/** Real contact channels only (from STORE.contact / STORE.social). No fake form. */
export default function ContactPage() {
  const { st } = useStoreT();
  const c = STORE.contact;
  const rows = [
    c.phone && { label: st("contact_phone"), value: c.phone, href: `tel:${c.phone.replace(/\s/g, "")}` },
    c.email && { label: st("contact_email"), value: c.email, href: `mailto:${c.email}` },
    c.messenger && { label: st("contact_messenger"), value: STORE.name, href: c.messenger },
    STORE.social.instagram && { label: "Instagram", value: STORE.name, href: STORE.social.instagram },
    STORE.social.facebook && { label: "Facebook", value: STORE.name, href: STORE.social.facebook },
    c.address && { label: st("contact_address"), value: c.address },
  ].filter(Boolean) as { label: string; value: string; href?: string }[];

  return (
    <InfoPage title={st("contact_title")} intro={st("contact_sub")}>
      {rows.length > 0 ? (
        <dl className="border-t border-ink/15">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-[16px] border-b border-ink/10 py-[22px]">
              <dt className="eyebrow">{r.label}</dt>
              <dd className="text-right">
                {r.href ? (
                  <a href={r.href} target={r.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="group inline-flex items-center gap-[6px] text-[18px] text-ink">
                    <span className="link-underline">{r.value}</span>
                    <ArrowUpRight className="h-[16px] w-[16px] text-ink/40 transition-transform duration-500 ease-silk group-hover:-translate-y-[2px] group-hover:translate-x-[2px]" strokeWidth={1.3} />
                  </a>
                ) : (
                  <span className="text-[18px] text-ink">{r.value}</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <DevHint>STORE.contact (phone, email, messenger, address) and STORE.social in src/config/store.ts. Only filled ones are shown.</DevHint>
      )}
      <p className="mt-[20px] text-[14px] text-taupe">{st("contact_order_tip")}</p>
    </InfoPage>
  );
}
