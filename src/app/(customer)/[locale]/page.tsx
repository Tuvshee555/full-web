import type { Metadata } from "next";
import { HomePage } from "@/components/store/HomePage";
import { JsonLd } from "@/components/JsonLd";
import { STORE, brandFor } from "@/config/store";
import { loadHeroImage, localeOf, pageMetadata, siteJsonLd } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

// The page is built ahead of time, with the current hero photo inside it. Rebuild it at most every
// 5 minutes, so a new best seller shows up without a redeploy.
export const revalidate = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = localeOf((await params).locale);
  const brand = brandFor(locale);
  return pageMetadata({ locale, path: "", absoluteTitle: `${STORE.name} | ${brand.heroTitle}`, description: brand.heroText });
}

export default async function Home({ params }: Props) {
  const locale = localeOf((await params).locale);
  // The hero photo is the largest thing on screen. It goes into the page's HTML, so the browser starts
  // downloading it at once instead of after the JavaScript has run and the product list has loaded.
  const hero = await loadHeroImage();
  return (
    <>
      <JsonLd data={siteJsonLd(locale)} />
      <HomePage initialHero={hero} />
    </>
  );
}
