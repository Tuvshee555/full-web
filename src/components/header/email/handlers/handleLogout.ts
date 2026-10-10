/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { toast } from "sonner";

// Log out but keep the cart.
export const handleLogout = (router: any, locale: string) => {
  for (const k of ["token", "userId", "email", "guest"]) localStorage.removeItem(k);
  window.dispatchEvent(new Event("auth-changed"));
  toast.success(locale === "mn" ? "Амжилттай гарлаа" : "Logged out");
  router.push(`/${locale}`);
};
