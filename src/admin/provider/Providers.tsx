"use client";

import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { AuthProvider } from "./AuthProvider";
import { Suspense, useState } from "react";
import { Toaster } from "@admin/components/ui/sonner";
import { ThemeProvider } from "next-themes";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Suspense>
            {children}
            <Toaster />
          </Suspense>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
