"use client";

import Link from "next/link";
import { STORE } from "@/config/store";
import { useStoreT } from "@/components/store/lib/useStoreT";

export default function CustomerNotFound() {
  const { st, locale } = useStoreT();
  return (
    <div className="page-width flex min-h-[50vh] flex-col items-start justify-center py-[48px]">
      {/* A client page cannot export metadata; React puts this title in <head>. */}
      <title>{`${st("page_not_found")} | ${STORE.name}`}</title>
      <p className="text-[14px] text-taupe">404</p>
      <h1 className="store-heading page-title mt-[12px]">{st("page_not_found")}</h1>
      <p className="mt-[16px] max-w-[480px] text-taupe">{st("page_not_found_body")}</p>
      <div className="mt-[24px] flex flex-wrap gap-[12px]">
        <Link className="btn" href={`/${locale}/collections/all`}>{st("continue_shopping")}</Link>
        <Link className="btn-secondary" href={`/${locale}`}>{st("home")}</Link>
      </div>
    </div>
  );
}
