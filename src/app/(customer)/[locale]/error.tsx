"use client";

import Link from "next/link";
import { useStoreT } from "@/components/store/lib/useStoreT";

export default function CustomerError({ retry }: { retry: () => void }) {
  const { st, locale } = useStoreT();
  return <div className="page-width flex min-h-[50vh] flex-col items-start justify-center py-[48px]"><h1 className="store-heading page-title">{st("page_error_title")}</h1><p className="mt-[16px] max-w-[480px] text-taupe">{st("page_error_body")}</p><div className="mt-[24px] flex flex-wrap gap-[12px]"><button type="button" onClick={retry} className="btn">{st("retry")}</button><Link className="btn-secondary" href={`/${locale}`}>{st("back_to_store")}</Link></div></div>;
}
