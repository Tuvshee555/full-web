/* eslint-disable @typescript-eslint/no-explicit-any -- the JSON-LD objects are inspected loosely in these tests */
import test from "node:test";
import assert from "node:assert/strict";
import { describe, pageMetadata, productJsonLd, serializeJsonLd, siteJsonLd, type ProductMeta } from "../../src/lib/seo";

const product = (overrides: Partial<ProductMeta> = {}): ProductMeta => ({
  id: "p1", name: "Serum", description: "A serum", image: "https://img.example/a.jpg", images: ["https://img.example/a.jpg"],
  lowPrice: 59900, highPrice: 59900, priceCount: 1, inStock: true, rating: 0, reviewCount: 0, ...overrides,
});

test("descriptions are one clean line, cut at a word boundary", () => {
  assert.equal(describe("  one \n two\t three  "), "one two three");
  assert.equal(describe(""), undefined);
  assert.equal(describe(null), undefined);
  const long = describe("word ".repeat(100), 60)!;
  assert.ok(long.length <= 60 && long.endsWith("…") && !long.includes("  "), long);
});

test("every page gets a canonical address and both language versions", () => {
  const meta = pageMetadata({ locale: "en", path: "/about", title: "About", description: "Hi" });
  assert.equal(meta.alternates?.canonical, "/en/about");
  assert.deepEqual(meta.alternates?.languages, { mn: "/mn/about", en: "/en/about", "x-default": "/mn/about" });
  assert.equal(meta.openGraph?.title, "About | Lorentz");
  assert.equal((meta.openGraph as { locale?: string }).locale, "en_US");
  assert.equal(meta.robots, undefined);
});

test("cart and account pages are marked noindex, the home page sets its own full title", () => {
  assert.deepEqual(pageMetadata({ locale: "mn", path: "/cart", title: "Cart", noindex: true }).robots, { index: false, follow: false });
  const home = pageMetadata({ locale: "mn", path: "", absoluteTitle: "Lorentz | Tagline" });
  assert.deepEqual(home.title, { absolute: "Lorentz | Tagline" });
  assert.equal(home.alternates?.canonical, "/mn");
});

test("a share card uses the product photo, and the branded card when there is no usable photo", () => {
  const withPhoto = pageMetadata({ locale: "mn", path: "/products/p1", title: "Serum", image: "https://img.example/a.jpg" });
  assert.deepEqual((withPhoto.openGraph?.images as { url: string }[])[0].url, "https://img.example/a.jpg");
  for (const image of [null, undefined, "/product-image-coming-soon.svg", "data:image/png;base64,AAA"]) {
    const meta = pageMetadata({ locale: "mn", path: "/x", title: "T", image });
    const first = (meta.openGraph?.images as { url: string; width?: number }[])[0];
    assert.equal(first.url, "/og-default.png");
    assert.equal(first.width, 1200);
  }
});

test("product structured data states the real price and stock", () => {
  const single = productJsonLd(product(), "mn") as Record<string, any>;
  assert.equal(single["@type"], "Product");
  assert.equal(single.offers["@type"], "Offer");
  assert.equal(single.offers.price, 59900);
  assert.equal(single.offers.priceCurrency, "MNT");
  assert.equal(single.offers.availability, "https://schema.org/InStock");
  assert.match(single.url, /\/mn\/products\/p1$/);

  const range = productJsonLd(product({ lowPrice: 39900, highPrice: 69900, priceCount: 2 }), "en") as Record<string, any>;
  assert.equal(range.offers["@type"], "AggregateOffer");
  assert.equal(range.offers.lowPrice, 39900);
  assert.equal(range.offers.highPrice, 69900);

  const sold = productJsonLd(product({ inStock: false }), "mn") as Record<string, any>;
  assert.equal(sold.offers.availability, "https://schema.org/OutOfStock");
});

test("ratings appear only when real reviews exist", () => {
  assert.equal("aggregateRating" in (productJsonLd(product(), "mn") as object), false);
  assert.equal("aggregateRating" in (productJsonLd(product({ rating: 5, reviewCount: 0 }), "mn") as object), false);
  const rated = productJsonLd(product({ rating: 4.666, reviewCount: 3 }), "mn") as Record<string, any>;
  assert.deepEqual(rated.aggregateRating, { "@type": "AggregateRating", ratingValue: 4.7, reviewCount: 3 });
});

test("product text can never break out of the structured-data script tag", () => {
  const evil = productJsonLd(product({ name: "</script><script>alert(1)</script>" }), "mn");
  const html = serializeJsonLd(evil);
  assert.equal(html.includes("</script>"), false);
  assert.equal(html.includes("<"), false);
  assert.equal(JSON.parse(html).name, "</script><script>alert(1)</script>");
});

test("the organisation lists the shop's real contact details", () => {
  const graph = (siteJsonLd("mn") as { "@graph": Record<string, any>[] })["@graph"];
  const org = graph.find((item) => item["@type"] === "Organization")!;
  assert.equal(org.name, "Lorentz");
  assert.match(org.telephone, /^\+976\d{8}$/);
  assert.equal(graph.find((item) => item["@type"] === "WebSite")!.inLanguage, "mn");
});
