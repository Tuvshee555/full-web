import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { PRODUCT_IMAGE, imageSrcSet, imageUrl } from "@/lib/image";
import { localeOf, loadProductMeta, pageMetadata, productJsonLd, storeMessages } from "@/lib/seo";
import ProductRoute from "./ProductRoute";

type Props = { params: Promise<{ locale: string; id: string }> };

// The share card (Messenger, Facebook, Google) shows this product's name, photo and price.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw, id } = await params;
  const locale = localeOf(raw);
  const product = await loadProductMeta(id);
  // Missing product, or a lookup that failed: no card of its own, and kept out of search results.
  if (!product) return pageMetadata({ locale, path: `/products/${id}`, noindex: true });
  const messages = await storeMessages(locale);
  const price = `${product.lowPrice.toLocaleString("en-US")}₮`;
  const priceText = product.lowPrice === product.highPrice ? price : messages.from_price.replace("{price}", price);
  return pageMetadata({
    locale,
    path: `/products/${product.id}`,
    title: product.name,
    description: [priceText, product.description].filter(Boolean).join(" · "),
    image: product.image,
  });
}

export default async function Product({ params }: Props) {
  const { locale, id } = await params;
  const product = await loadProductMeta(id);
  // A real 404 status for a product that does not exist. A failed lookup (undefined)
  // still renders, because the page itself reloads the product in the browser.
  if (product === null) notFound();
  return (
    <>
      {/* The main photo is the largest thing on screen: fetch it now, not after the page's JavaScript has loaded. */}
      {product?.image && (
        <link
          rel="preload"
          as="image"
          href={imageUrl(product.image, PRODUCT_IMAGE.width)}
          imageSrcSet={imageSrcSet(product.image, [...PRODUCT_IMAGE.widths])}
          imageSizes={PRODUCT_IMAGE.sizes}
          fetchPriority="high"
        />
      )}
      {product && <JsonLd data={productJsonLd(product, localeOf(locale))} />}
      <ProductRoute id={id} />
    </>
  );
}
