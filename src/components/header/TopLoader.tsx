"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import NProgress from "nprogress";

// global config (runs once)
NProgress.configure({
  showSpinner: false,
  trickleSpeed: 200,
  minimum: 0.15,
  barSelector: ".bar",
  template: '<div class="bar" role="presentation"><div class="peg"></div></div>',
});

export default function TopLoader() {
  const pathname = usePathname();

  useEffect(() => {
    NProgress.start();
    NProgress.done();
  }, [pathname]);

  return null;
}
