"use client";

import { InfoPage } from "@/components/store/InfoPage";
import { useStoreT } from "@/components/store/lib/useStoreT";

// Required by Facebook Login (data deletion instructions URL).
const DELETION_EMAIL = "ganturtuvshinsaihan@gmail.com";

export default function DataDeletion() {
  const { st } = useStoreT();
  return (
    <InfoPage title={st("data_title")}>
      <p className="text-[16px] leading-relaxed text-ink/75">{st("data_text")}</p>
      <a href={`mailto:${DELETION_EMAIL}`} className="link-underline mt-[14px] inline-block text-[20px] text-ink">
        {DELETION_EMAIL}
      </a>
    </InfoPage>
  );
}
