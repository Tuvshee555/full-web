"use client";

import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";

const LOCALES = [
  { code: "mn", label: "Монгол" },
  { code: "en", label: "English" },
];

/** Language switch for the sign-in and password pages (the menu has its own). */
export function AuthLanguage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname() ?? "";
  return (
    <div role="group" aria-label={t("nav.language")} className="ml-auto flex gap-[2px]">
      {LOCALES.map((l) => (
        <button
          key={l.code}
          type="button"
          lang={l.code}
          aria-pressed={locale === l.code}
          onClick={() => router.replace(`${pathname.replace(/^\/admin\/(mn|en)/, `/admin/${l.code}`)}${window.location.search}`)}
          className={`min-h-[40px] px-[10px] text-[13px] transition-colors ${locale === l.code ? "bg-ink font-medium text-paper" : "text-taupe hover:text-ink"}`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
