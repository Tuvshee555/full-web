/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import ClientI18nProvider from "@admin/components/i18n/ClientI18nProvider";
import QueryProvider from "./QueryProvider";
import { AuthProvider } from "@admin/provider/AuthProvider";
import Providers from "@admin/provider/Providers";
import Header from "@admin/components/header/Header";

type Props = {
  children: ReactNode;
  params: any;
};

export function generateStaticParams() {
  return [{ locale: "mn" }, { locale: "en" }, { locale: "ko" }];
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = (await params) as { locale: string };

  if (!locale) return notFound();

  let messages: Record<string, string>;
  try {
    messages = (await import(`../../../../admin/messages/${locale}.json`)).default;
  } catch {
    return notFound();
  }

  return (
    <QueryProvider>
      <ClientI18nProvider locale={locale} messages={messages}>
        <AuthProvider>
          <Providers>
            <Header />
            {children}
          </Providers>
        </AuthProvider>
      </ClientI18nProvider>
    </QueryProvider>
  );
}
