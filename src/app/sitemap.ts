import type { MetadataRoute } from "next";
import { siteUrl } from "../../server/utils/siteUrl.js";

// Built on request from the live catalogue, so a product added in the admin is
// listed straight away and nothing needs a database at build time.
export const dynamic = "force-dynamic";

const LOCALES = ["mn", "en"] as const;

type Page = { path: string; modified?: Date; priority: number; changeFrequency: "weekly" | "monthly" | "yearly" };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: Page[] = [
    { path: "", priority: 1, changeFrequency: "weekly" },
    { path: "/collections/all", priority: 0.9, changeFrequency: "weekly" },
    { path: "/about", priority: 0.4, changeFrequency: "monthly" },
    { path: "/contact", priority: 0.4, changeFrequency: "monthly" },
    { path: "/faq", priority: 0.4, changeFrequency: "monthly" },
  ];
  try {
    const { prisma } = await import("../../server/prismaClient.js");
    const [products, categories] = await Promise.all([
      prisma.product.findMany({ select: { id: true, updatedAt: true } }),
      prisma.category.findMany({ where: { products: { some: {} } }, select: { id: true } }),
    ]);
    for (const category of categories as { id: string }[]) pages.push({ path: `/collections/${category.id}`, priority: 0.7, changeFrequency: "weekly" });
    for (const product of products as { id: string; updatedAt: Date }[]) pages.push({ path: `/products/${product.id}`, modified: product.updatedAt, priority: 0.8, changeFrequency: "weekly" });
  } catch (error) {
    // Still serve the fixed pages if the database is briefly unreachable.
    console.error("Sitemap catalogue lookup failed:", (error as Error)?.message);
  }
  const base = siteUrl();
  return pages.flatMap((page) =>
    LOCALES.map((locale) => ({
      url: `${base}/${locale}${page.path}`,
      ...(page.modified ? { lastModified: page.modified } : {}),
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, `${base}/${l}${page.path}`])) },
    })),
  );
}
