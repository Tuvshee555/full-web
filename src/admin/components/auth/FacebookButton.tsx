"use client";

import { API_BASE_URL } from "@admin/lib/api";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@admin/provider/AuthProvider";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";

declare global {
  interface Window {
    FB: fb.FacebookStatic;
    fbAsyncInit: () => void;
  }
}

export const FacebookButton = ({ role = "USER" }: { role?: string }) => {
  const { t } = useI18n();
  const router = useRouter();
  const { setAuthToken } = useAuth();

  /* ---------- load SDK ---------- */
  useEffect(() => {
    if (typeof window === "undefined" || window.FB) return;

    window.fbAsyncInit = () => {
      window.FB.init({
        appId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID!,
        cookie: true,
        xfbml: true,
        version: "v20.0",
      });
    };

    const script = document.createElement("script");
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  /* ---------- auth ---------- */
  const handleFacebookAuth = () => {
    if (!window.FB) {
      toast.error(t("facebook_sdk_error"));
      return;
    }

    window.FB.login(
      async (response: fb.StatusResponse) => {
        if (!response.authResponse) {
          toast.error(t("facebook_cancelled"));
          return;
        }

        try {
          const res = await fetch(
            `${API_BASE_URL}/user/auth/facebook`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                token: response.authResponse.accessToken,
                role,
              }),
            }
          );

          const data = await res.json();

          if (!res.ok) {
            toast.error(data.message || t("facebook_auth_error"));
            return;
          }

          localStorage.setItem("adminToken", data.token);
          localStorage.setItem("adminEmail", data.user.email);
          localStorage.setItem("adminUserId", data.user.id);
          setAuthToken(data.token);

          toast.success(t("facebook_login_success", { role: data.user.role }));
          router.push("/admin/home-page");
        } catch {
          toast.error(t("facebook_auth_error"));
        }
      },
      { scope: "email,public_profile" }
    );
  };

  return (
    <button
      type="button"
      onClick={handleFacebookAuth}
      className="
        h-[44px]
        w-full
        rounded-md
        text-white
        font-medium
        bg-[#1877F2]
      "
    >
      {t("facebook_continue")}
    </button>
  );
};
