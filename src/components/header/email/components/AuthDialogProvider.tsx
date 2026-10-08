"use client";

import { createContext, useContext, useState } from "react";
import AuthDrawer from "@/components/AuthDrawer";

const AuthDialogContext = createContext<{
  open: () => void;
  close: () => void;
} | null>(null);

export function AuthDialogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <AuthDialogContext.Provider
      value={{
        open: () => setOpen(true),
        close: () => setOpen(false),
      }}
    >
      {children}
      <AuthDrawer open={open} onClose={() => setOpen(false)} />
    </AuthDialogContext.Provider>
  );
}

export const useAuthDialog = () => {
  const ctx = useContext(AuthDialogContext);
  if (!ctx) throw new Error("useAuthDialog must be used inside provider");
  return ctx;
};
