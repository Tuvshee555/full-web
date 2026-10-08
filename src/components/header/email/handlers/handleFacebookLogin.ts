/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { API_BASE_URL } from "@/lib/api";
import { toast } from "sonner";
import { FacebookAuthResponse } from "../types";

export const handleFacebookLogin = (
  redirect: string,
  router: any,
  locale: string
) => {
  if (!window.FB) return toast.error("Facebook SDK not loaded");

  window.FB.login(
    async (res: FacebookAuthResponse) => {
      if (!res.authResponse?.accessToken)
        return toast.error("Facebook login cancelled");

      const token = res.authResponse.accessToken;

      try {
        const result = await fetch(
          `${API_BASE_URL}/user/auth/facebook`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          }
        );

        const data = await result.json();
        if (!data.token) return toast.error("Facebook login failed");

        localStorage.setItem("token", data.token);
        localStorage.setItem("email", data.user.email);
        localStorage.setItem("userId", data.user.id);

        window.dispatchEvent(new Event("auth-changed"));

        toast.success("Facebook logged in!");
        router.push(`/${locale}${redirect}`);
      } catch {
        toast.error("Facebook login error");
      }
    },
    { scope: "email,public_profile" }
  );
};
