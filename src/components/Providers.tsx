"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";

// Storefront is light-only (Shopify Dawn look), so no theme provider.
export default function Providers({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster position="top-center" toastOptions={{ style: { borderRadius: 0 } }} />
    </>
  );
}
