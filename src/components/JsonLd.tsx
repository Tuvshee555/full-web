import { serializeJsonLd } from "@/lib/seo";

// Structured data for search engines (see serializeJsonLd for the escaping).
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
