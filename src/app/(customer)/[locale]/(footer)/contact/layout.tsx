import { staticPageMetadata } from "@/lib/seo";

export { default } from "@/components/PassThrough";
export const generateMetadata = staticPageMetadata("/contact", "contact_title", { description: (m) => m.contact_sub });
