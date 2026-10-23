import { staticPageMetadata } from "@/lib/seo";

export { default } from "@/components/PassThrough";
export const generateMetadata = staticPageMetadata("/checkout", "checkout", { noindex: true });
