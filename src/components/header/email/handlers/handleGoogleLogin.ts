/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { API_BASE_URL } from "@/lib/api";
import { toast } from "sonner";
import { GooglePayload } from "../types";
import { saveAuth } from "@/utils/auth";

export const handleGoogleLogin = async (
  payload: GooglePayload,
  redirect: string,
  router: any,
  locale: string
) => {
  const credential = payload.credential;
  if (!credential) return toast.error("Google credential missing");

  try {
    const res = await fetch(
      `${API_BASE_URL}/user/auth/google`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: credential, role: "USER" }),
      }
    );

    const data = await res.json();
    if (!res.ok) return toast.error(data.message || "Google login failed");

    localStorage.setItem("token", data.token);
    localStorage.setItem("userId", data.user.id);
    localStorage.setItem("email", data.user.email);

    saveAuth(data);
    window.dispatchEvent(new Event("auth-changed"));

    toast.success("Google logged in!");
    router.push(`/${locale}${redirect}`);
  } catch {
    toast.error("Google login error");
  }
};
