import { staticPageMetadata } from "@/lib/seo";

export { default } from "@/components/PassThrough";
export const generateMetadata = staticPageMetadata("/checkout/payment-pending", "pay_now_title", { noindex: true });
