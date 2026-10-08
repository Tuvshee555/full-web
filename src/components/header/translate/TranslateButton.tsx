"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { useI18n } from "@/components/i18n/ClientI18nProvider";

const languages = [
  { code: "mn", label: "Монгол", flag: "🇲🇳" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
];

export default function TranslateButton() {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const currentLocale = pathname.split("/")[1] || "mn";

  const changeLang = (code: string) => {
    const withoutLocale = pathname.replace(/^\/(mn|en|ko)/, "");
    router.push(`/${code}${withoutLocale}`);
    setOpen(false);
  };

  const currentFlag =
    languages.find((l) => l.code === currentLocale)?.flag ?? "🌐";

  return (
    <>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="
    flex items-center gap-2
    h-[44px] md:h-[33px]
 px-3
    rounded-md
    border border-border md:border-0
    bg-card md:bg-transparent
    text-foreground
    text-sm font-medium
    transition
    hover:bg-muted
  "
      >
        <Globe size={16} />
        <span>{currentFlag}</span>
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="
            fixed inset-0 z-[9999]
            flex items-center justify-center
            bg-background/80 backdrop-blur-sm
          "
          onClick={() => setOpen(false)}
        >
          {/* Modal */}
          <div
            className="
              w-[90%] max-w-[360px]
              rounded-xl
              bg-card text-foreground
              border border-border
              p-5
              shadow-lg
            "
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-center">
              {t("language.select")}
            </h3>

            <div className="mt-4 space-y-2">
              {languages.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => changeLang(l.code)}
                  className="
                    flex items-center justify-center gap-3
                    w-full h-[44px]
                    rounded-md
                    border border-border
                    bg-background
                    text-sm font-medium
                    transition
                    hover:bg-muted
                  "
                >
                  <span className="text-lg">{l.flag}</span>
                  <span>{l.label}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="
                mt-5 w-full h-[44px]
                rounded-md
                border border-border
                text-sm
                transition
                hover:bg-muted
              "
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
