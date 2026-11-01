import { staticPageMetadata } from "@/lib/seo";

export { default } from "@/components/PassThrough";
// A personal look-up form: nothing here for search engines.
export const generateMetadata = staticPageMetadata("/order-status", "lookup_title", { noindex: true, description: (m) => m.lookup_intro });
