import { describe, staticPageMetadata } from "@/lib/seo";

export { default } from "@/components/PassThrough";
export const generateMetadata = staticPageMetadata("/data-deletion", "data_title", { description: (m) => describe(m.data_text) });
