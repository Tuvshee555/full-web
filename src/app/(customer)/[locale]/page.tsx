import type { Metadata } from "next";
import { HomePage } from "@/components/store/HomePage";
import { JsonLd } from "@/components/JsonLd";
import { STORE, brandFor } from "@/config/store";
import { localeOf, pageMetadata, siteJsonLd } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = localeOf((await params).locale);
  const brand = brandFor(locale);
  return pageMetadata({ locale, path: "", absoluteTitle: `${STORE.name} | ${brand.heroTitle}`, description: brand.heroText });
}

export default async function Home({ params }: Props) {
  const locale = localeOf((await params).locale);
  return (
    <>
      <JsonLd data={siteJsonLd(locale)} />
      <HomePage />
    </>
  );
}
