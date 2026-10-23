import type { MetadataRoute } from "next";
import { siteUrl } from "../../server/utils/siteUrl.js";

// Cart, checkout and account pages carry their own "noindex" tag (crawlers have
// to be allowed to read it), so only the admin and the API are fenced off here.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
