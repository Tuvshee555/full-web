/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { toast } from "sonner";

export const handleLogout = (
  router: any,
  clearToken: () => void,
  locale: string
) => {
  clearToken();

  localStorage.removeItem("token");
  localStorage.removeItem("userId");
  localStorage.removeItem("email");
  localStorage.removeItem("guest");

  window.dispatchEvent(new Event("auth-changed"));
  toast.success("Амжилттай гарлаа");

  router.push(`/${locale}/home-page`);
};
