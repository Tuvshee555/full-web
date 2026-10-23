// Plain <a> links on purpose: this page renders outside the app router, so a full page load is the safe way out.
/* eslint-disable @next/next/no-html-link-for-pages */
import type { Metadata } from "next";
import "./(customer)/globals.css";
import { STORE } from "@/config/store";
import { displayFont, displayItalic, storeFont } from "@/lib/fonts";

// Any address that matches no page at all (a mistyped link, an old URL). The store
// and the admin have separate root layouts, so this page brings its own <html>.
// Pages that exist but find nothing (a deleted product) use [locale]/not-found.tsx.
export const metadata: Metadata = {
  title: `404 | ${STORE.name}`,
  robots: { index: false, follow: false },
};

export default function GlobalNotFound() {
  return (
    <html lang="mn">
      <body className={`${storeFont.variable} ${displayFont.variable} ${displayItalic.variable} store-body antialiased`}>
        <main className="page-width flex min-h-[100dvh] flex-col items-start justify-center py-[48px]">
          <a href="/mn" className="store-heading text-[30px] leading-none text-ink">{STORE.name}</a>
          <p className="mt-[40px] text-[14px] text-taupe">404</p>
          <h1 className="store-heading page-title mt-[12px]">Хуудас олдсонгүй</h1>
          <p className="mt-[16px] max-w-[480px] text-taupe">Хуудас эсвэл бүтээгдэхүүн өөрчлөгдсөн, эсвэл байхгүй болсон байж болно.</p>
          <p lang="en" className="mt-[8px] max-w-[480px] text-taupe">This page may have moved or no longer exists.</p>
          <div className="mt-[24px] flex flex-wrap gap-[12px]">
            <a className="btn" href="/mn/collections/all">Дэлгүүр хэсэх</a>
            <a className="btn-secondary" href="/en/collections/all" lang="en">Browse the shop</a>
          </div>
        </main>
      </body>
    </html>
  );
}
