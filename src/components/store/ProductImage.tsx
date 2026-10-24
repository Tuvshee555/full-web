/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, type ImgHTMLAttributes } from "react";

/** Keep the real product image when available, and a quiet fallback on failure. */
export function ProductImage({
  src,
  srcSet,
  alt = "",
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const imageSource =
    typeof src === "string" && src && failedSource !== src
      ? src
      : "/product-image-coming-soon.svg";
  return (
    <img
      {...props}
      src={imageSource}
      srcSet={failedSource === src ? undefined : srcSet}
      alt={alt}
      onError={() => setFailedSource(typeof src === "string" ? src : "")}
    />
  );
}
