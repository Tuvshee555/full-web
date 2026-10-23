import { staticPageMetadata } from "@/lib/seo";

export { default } from "@/components/PassThrough";
export const generateMetadata = staticPageMetadata("/cart", "your_cart", { noindex: true });
