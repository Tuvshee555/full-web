// Product photos are served at the size the screen needs, not the size they were uploaded at.
// A phone photo is easily 0.5-1 MB even after the admin shrinks it; a phone screen needs about 60 KB.
// Unsplash and Cloudinary resize on request (both are already allowed hosts in next.config.mjs);
// any other address is returned untouched.

const CLOUDINARY_UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)$/;
// "w_200" or "f_auto,q_auto": a transformation the uploader already put in the address
const TRANSFORMATION = /^[a-z]{1,3}_[^/,]+(,[a-z]{1,3}_[^/,]+)*$/i;

/** The home hero photo: the server preloads exactly what the page's <img> will ask for. */
export const HERO_IMAGE = { width: 800, widths: [480, 800, 1200], sizes: "(min-width: 1024px) 50vw, 100vw" } as const;

/** The product page's main photo: preloaded by the server with exactly what the gallery will ask for. */
export const PRODUCT_IMAGE = { width: 960, widths: [480, 720, 960, 1280], sizes: "(min-width: 768px) 50vw, 100vw" } as const;

/** The photo resized to `width` pixels wide (never enlarged), as small as the format allows. */
export function imageUrl(url: string, width: number): string {
  if (typeof url !== "string" || !url) return url;
  const cloudinary = CLOUDINARY_UPLOAD.exec(url);
  if (cloudinary) {
    const [, head, rest] = cloudinary;
    if (TRANSFORMATION.test(rest.split("/")[0])) return url;
    return `${head}f_auto,q_auto,w_${width},c_limit/${rest}`;
  }
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "images.unsplash.com") {
      parsed.searchParams.set("w", String(width));
      parsed.searchParams.set("q", "75");
      parsed.searchParams.set("auto", "format");
      return parsed.toString();
    }
  } catch {
    /* not an absolute URL (e.g. the "coming soon" placeholder): leave it */
  }
  return url;
}

/** `srcSet` for an <img>, so the browser downloads the smallest width that still looks sharp. */
export function imageSrcSet(url: string, widths: number[] = [320, 480, 640, 960, 1280]): string | undefined {
  const sample = imageUrl(url, widths[0]);
  if (sample === url) return undefined; // cannot be resized: a single src is correct
  return widths.map((w) => `${imageUrl(url, w)} ${w}w`).join(", ");
}
