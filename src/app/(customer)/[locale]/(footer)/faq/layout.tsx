import { staticPageMetadata } from "@/lib/seo";

export { default } from "@/components/PassThrough";
export const generateMetadata = staticPageMetadata("/faq", "faq_title", { description: (m) => m.faq_description });
