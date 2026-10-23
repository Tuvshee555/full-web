/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import "../globals.css";
import ClientI18nProvider from "@/components/i18n/ClientI18nProvider";
import QueryProvider from "./QueryProvider";
import { AuthProvider } from "./provider/AuthProvider";

import Providers from "@/components/Providers"; // client wrapper for next-themes
import AppShellClient from "@/components/AppShellClient";
import { AuthDialogProvider } from "@/components/header/email/components/AuthDialogProvider";
import { STORE, brandFor } from "@/config/store";
import { displayFont, displayItalic, storeFont } from "@/lib/fonts";
import { localeOf, metadataBase } from "@/lib/seo";

type Props = {
  children: ReactNode;
  params: any;
};

// The browser's address bar and the phone's task switcher take the store's paper colour.
export const viewport: Viewport = { themeColor: "#fbf8f3" };

export function generateStaticParams() {
  return [{ locale: "mn" }, { locale: "en" }];
}

// Defaults for every page; each page adds its own title, description and share card.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = localeOf((await params)?.locale);
  return {
    metadataBase: metadataBase(),
    applicationName: STORE.name,
    title: { default: STORE.name, template: `%s | ${STORE.name}` },
    description: brandFor(locale).heroText,
  };
}

// This is the root layout of the storefront, so <html lang> follows the page's language.
export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = (await params) as { locale: string };

  if (!locale) return notFound();

  let messages: Record<string, string>;
  try {
    messages = (await import(`../../../messages/${locale}.json`)).default;
  } catch {
    return notFound();
  }

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${storeFont.variable} ${displayFont.variable} ${displayItalic.variable} store-body antialiased`}>
        <QueryProvider>
          <ClientI18nProvider locale={locale} messages={messages}>
            <AuthProvider>
              <Providers>
                <AuthDialogProvider>
                  <AppShellClient>{children}</AppShellClient>
                </AuthDialogProvider>
              </Providers>
            </AuthProvider>
          </ClientI18nProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
