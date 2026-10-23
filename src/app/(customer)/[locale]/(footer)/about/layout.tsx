import { brandFor } from "@/config/store";
import { describe, staticPageMetadata } from "@/lib/seo";

export { default } from "@/components/PassThrough";
export const generateMetadata = staticPageMetadata("/about", "about_title", { description: (_m, locale) => describe(brandFor(locale).about[0]) });
