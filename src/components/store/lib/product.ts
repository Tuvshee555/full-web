/* eslint-disable @typescript-eslint/no-explicit-any */

export const money = (v: number | null | undefined) =>
  `${Math.round(Number(v ?? 0)).toLocaleString("en-US")}₮`;

export const productUrl = (locale: string, id: string) => `/${locale}/products/${id}`;
export const collectionUrl = (locale: string, id = "all") => `/${locale}/collections/${id}`;

export const sizeLabel = (s: any): string =>
  typeof s === "string" ? s : (s?.label ?? "");

/** A size is sold out only when its stock is tracked and has run out. */
export const sizeSoldOut = (s: any) =>
  typeof s === "object" && s !== null && s.stock !== null && s.stock !== undefined && Number(s.stock) <= 0;

export function isSoldOut(p: any) {
  const sizes = Array.isArray(p?.sizes) ? p.sizes : [];
  return sizes.length > 0 && sizes.every(sizeSoldOut);
}

export function onSale(p: any) {
  const price = Number(p?.price);
  const compare = Number(p?.oldPrice);
  return Number.isFinite(compare) && compare > price;
}

export function productImages(p: any): string[] {
  const list: string[] = [];
  if (typeof p?.image === "string" && p.image) list.push(p.image);
  if (Array.isArray(p?.extraImages)) {
    for (const img of p.extraImages) if (typeof img === "string" && img) list.push(img);
  }
  return list.length ? list : ["/product-image-coming-soon.svg"];
}
