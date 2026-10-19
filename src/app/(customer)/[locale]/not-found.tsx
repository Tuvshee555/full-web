"use client";

import Link from "next/link";
import { useStoreT } from "@/components/store/lib/useStoreT";

export default function CustomerNotFound() {
  const { st, locale } = useStoreT();
  return <div className="page-width flex min-h-[50vh] flex-col items-start justify-center py-[48px]"><p className="text-[14px] text-taupe">404</p><h1 className="store-heading page-title mt-[12px]">{st("page_not_found")}</h1><p className="mt-[16px] text-taupe">{st("page_not_found_body")}</p><Link className="btn mt-[24px]" href={`/${locale}/collections/all`}>{st("continue_shopping")}</Link></div>;
}
