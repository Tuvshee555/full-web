"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { STORE } from "@/config/store";
import { collectionUrl } from "./lib/product";
import { useStoreT } from "./lib/useStoreT";

const LANGUAGES = [
  { code: "mn", label: "Монгол" },
  { code: "en", label: "English" },
];

export function StoreFooter() {
  const { st, locale } = useStoreT();
  const pathname = usePathname() ?? `/${locale}`;
  const router = useRouter();

  const columns = [
    {
      title: st("quick_links"),
      links: [
        [st("home"), `/${locale}`],
        [st("all_products"), collectionUrl(locale)],
        [st("my_orders"), `/${locale}/profile`],
      ],
    },
    {
      title: st("info"),
      links: [
        [st("about"), `/${locale}/about`],
        [st("contact"), `/${locale}/contact`],
        [st("faq"), `/${locale}/faq`],
      ],
    },
  ];

  const switchLanguage = (code: string) => {
    const rest = pathname.replace(/^\/(mn|en)(?=\/|$)/, "");
    router.push(`/${code}${rest}`);
  };

  return (
    <footer className="overflow-hidden bg-espresso text-paper/70">
      <div className="page-width grid gap-[40px] pt-[72px] pb-[40px] md:grid-cols-12 md:pt-[96px]">
        <div className="md:col-span-6">
          <p className="display-italic max-w-[420px] text-[30px] leading-[1.15] text-paper md:text-[36px]">{st("hero_text")}</p>
          {(STORE.social.facebook || STORE.social.instagram) && (
            <ul className="mt-[20px] flex gap-[20px] text-[14px]">
              {STORE.social.facebook && (
                <li>
                  <a href={STORE.social.facebook} target="_blank" rel="noreferrer" className="link-underline">
                    Facebook
                  </a>
                </li>
              )}
              {STORE.social.instagram && (
                <li>
                  <a href={STORE.social.instagram} target="_blank" rel="noreferrer" className="link-underline">
                    Instagram
                  </a>
                </li>
              )}
            </ul>
          )}
        </div>
        {columns.map((col, i) => (
          <div key={col.title} className={i === 0 ? "md:col-span-3 md:col-start-7" : "md:col-span-3"}>
            <h2 className="eyebrow !text-paper/45">{col.title}</h2>
            <ul className="mt-[18px] space-y-[10px] text-[15px]">
              {col.links.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="text-paper/80 transition-colors duration-300 hover:text-paper link-underline">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="page-width flex flex-col items-start gap-[18px] border-t border-paper/10 py-[24px] text-[12px] md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-[6px]" role="group" aria-label={st("language")}>
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => switchLanguage(l.code)}
              aria-pressed={locale === l.code}
              className={`px-[10px] py-[6px] transition-colors ${locale === l.code ? "bg-paper text-ink" : "text-paper/60 hover:text-paper"}`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <ul className="flex gap-[8px]" aria-label={st("payment_methods")}>
          {["QPay", st("bank")].map((m) => (
            <li key={m} className="px-[10px] py-[5px] text-paper/70 ring-1 ring-paper/15">
              {m}
            </li>
          ))}
        </ul>
        <p className="text-paper/45">
          © {new Date().getFullYear()} {STORE.name}
        </p>
      </div>

      {/* Oversized wordmark, cropped at the bottom edge */}
      <div className="page-width select-none" aria-hidden>
        <p className="store-heading -mb-[0.22em] whitespace-nowrap text-center !text-paper/[0.08] text-[22vw] leading-none md:text-[17vw]">{STORE.name}</p>
      </div>
    </footer>
  );
}
