"use client";

import { useEffect, useRef, useState } from "react";
import { GoogleLogin, type GoogleLoginProps } from "@react-oauth/google";

/** Google's iframe uses a pixel width; measure the available space before mounting. */
export function ResponsiveGoogleLogin(props: Omit<GoogleLoginProps, "width">) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.min(400, Math.floor(entry.contentRect.width))));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className="min-h-[44px] w-full min-w-0">{width > 0 && <GoogleLogin {...props} width={width} />}</div>;
}
