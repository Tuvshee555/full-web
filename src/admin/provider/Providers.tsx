"use client";

import { Suspense } from "react";
import { Toaster } from "@admin/components/ui/sonner";
import { ThemeProvider } from "next-themes";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false}>
      <Suspense>
        {children}
        <Toaster position="top-center" />
      </Suspense>
    </ThemeProvider>
  );
}
