import type { Metadata } from "next";
import { loadCategoryName, localeOf, pageMetadata, storeMessages } from "@/lib/seo";

export { default } from "@/components/PassThrough";

// "all", "featured", "discounted" and "bestseller" are built-in views; anything else is a category id.
export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }): Promise<Metadata> {
  const { locale: raw, id } = await params;
  const locale = localeOf(raw);
  const messages = await storeMessages(locale);
  const builtIn: Record<string, string> = {
    all: messages.all_products, featured: messages.sort_featured, discounted: messages.on_sale, bestseller: messages.sort_best,
  };
  const title = Object.hasOwn(builtIn, id) ? builtIn[id] : await loadCategoryName(id);
  return pageMetadata({ locale, path: `/collections/${id}`, title: title ?? messages.all_products, noindex: title == null });
}
