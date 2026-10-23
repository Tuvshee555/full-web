"use client";

import { InfoPage } from "@/components/store/InfoPage";
import { LegalBody } from "@/components/store/LegalBody";
import { money } from "@/components/store/lib/product";
import { useStoreT } from "@/components/store/lib/useStoreT";
import { termsDocument } from "@/config/legal";
import { DELIVERY_FEE } from "@/data/mongoliaLocations";

export default function TermsPage() {
  const { st, locale } = useStoreT();
  return (
    <InfoPage title={st("terms_page")}>
      <LegalBody doc={termsDocument(locale, money(DELIVERY_FEE))} />
    </InfoPage>
  );
}
