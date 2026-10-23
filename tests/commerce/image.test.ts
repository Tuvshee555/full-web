import test from "node:test";
import assert from "node:assert/strict";
import { imageSrcSet, imageUrl } from "../../src/lib/image";

test("Cloudinary photos are delivered resized, in the best format, never enlarged", () => {
  const original = "https://res.cloudinary.com/demo/image/upload/v1716543210/products/serum.jpg";
  assert.equal(imageUrl(original, 640), "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_640,c_limit/v1716543210/products/serum.jpg");
  // an address that already carries a transformation is left alone
  const already = "https://res.cloudinary.com/demo/image/upload/w_200,h_200/v1/products/a.jpg";
  assert.equal(imageUrl(already, 640), already);
  assert.equal(imageUrl("https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v1/a.jpg", 640), "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v1/a.jpg");
});

test("Unsplash photos are requested at the needed width", () => {
  const url = imageUrl("https://images.unsplash.com/photo-1?w=1200&q=80&auto=format&fit=crop", 480);
  const params = new URL(url).searchParams;
  assert.equal(params.get("w"), "480");
  assert.equal(params.get("q"), "75");
  assert.equal(params.get("fit"), "crop");
});

test("anything else is left exactly as it is", () => {
  for (const url of ["/product-image-coming-soon.svg", "https://example.com/a.jpg", "data:image/png;base64,AAAA", "https://res.cloudinary.com/demo/video/upload/v1/clip.mp4", ""]) {
    assert.equal(imageUrl(url, 640), url);
    assert.equal(imageSrcSet(url), undefined);
  }
});

test("srcset lists every width, smallest first, only for resizable photos", () => {
  const set = imageSrcSet("https://res.cloudinary.com/demo/image/upload/v1/a.jpg", [320, 640])!;
  assert.equal(set, "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_320,c_limit/v1/a.jpg 320w, https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_640,c_limit/v1/a.jpg 640w");
});
