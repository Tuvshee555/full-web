import { staticPageMetadata } from "@/lib/seo";

export { default } from "@/components/PassThrough";
export const generateMetadata = staticPageMetadata("/checkout/bank-transfer", "pay_by_transfer", { noindex: true });
