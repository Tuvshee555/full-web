"use client";

import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { AuthProvider } from "./AuthProvider";
import { CategoryProvider } from "./CategoryProvider";
import { Toaster } from "sonner";
import { useState } from "react";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <div>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <CategoryProvider>
            {children}
            <Toaster />
          </CategoryProvider>
        </AuthProvider>
      </QueryClientProvider>
    </div>
  );
}
