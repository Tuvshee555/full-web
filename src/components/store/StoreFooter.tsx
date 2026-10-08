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
    <footer className="mt-[60px] border-t border-[rgba(18,18,18,0.08)] bg-white">
      <div className="page-width grid gap-[40px] py-[45px] md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="store-heading text-[18px]">{STORE.name}</p>
          {(STORE.social.facebook || STORE.social.instagram) && (
            <ul className="mt-[16px] flex gap-[16px] text-[14px]">
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
        {columns.map((col) => (
          <div key={col.title}>
            <h2 className="store-heading text-[18px]">{col.title}</h2>
            <ul className="mt-[16px] space-y-[8px] text-[14px]">
              {col.links.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="link-underline hover:text-[#121212]">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-[rgba(18,18,18,0.08)]">
        <div className="page-width flex flex-col items-center gap-[16px] py-[24px] md:flex-row md:justify-between">
          <label className="field !w-[180px]">
            <select value={locale} onChange={(e) => switchLanguage(e.target.value)} aria-label={st("language")}>
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute left-[15px] top-[4px] text-[11px] text-[rgba(18,18,18,0.6)]">{st("language")}</span>
          </label>
          <ul className="flex gap-[8px]" aria-label={st("payment_methods")}>
            {["QPay", st("bank")].map((m) => (
              <li key={m} className="rounded-[3px] border border-[rgba(18,18,18,0.2)] px-[8px] py-[3px] text-[11px] tracking-[0.05rem] text-[#121212]">
                {m}
              </li>
            ))}
          </ul>
          <p className="text-[11px] tracking-[0.05rem]">
            © {new Date().getFullYear()}, {STORE.name}
          </p>
        </div>
      </div>
    </footer>
  );
}
