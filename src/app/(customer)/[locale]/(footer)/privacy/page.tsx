"use client";

import Link from "next/link";
import { InfoPage } from "@/components/store/InfoPage";
import { LegalBody } from "@/components/store/LegalBody";
import { useStoreT } from "@/components/store/lib/useStoreT";
import { privacyDocument } from "@/config/legal";

export default function PrivacyPage() {
  const { st, locale } = useStoreT();
  return (
    <InfoPage title={st("privacy_page")}>
      <LegalBody doc={privacyDocument(locale)} />
      <Link href={`/${locale}/data-deletion`} className="link-underline mt-[16px] inline-flex min-h-[44px] items-center text-[15px] text-ink">
        {st("data_title")}
      </Link>
    </InfoPage>
  );
}
