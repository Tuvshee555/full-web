/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client";

import { API_BASE_URL } from "@admin/lib/api";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";
import { UserType } from "@admin/type/type";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";

declare global {
  interface Window {
    FB: fb.FacebookStatic;
    fbAsyncInit: () => void;
  }
}

export const CreateEmail = ({ nextStep, user, setUser }: UserType) => {
  const { t } = useI18n();
  const router = useRouter();

  /* ---------- Facebook SDK ---------- */
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
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  /* ---------- Google ---------- */
  const handleGoogleSignUp = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      toast.error(t("google_error"));
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE_URL}/user/auth/google`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: credentialResponse.credential,
            role: "ADMIN",
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || t("google_error"));
        return;
      }

      localStorage.setItem("adminUser", JSON.stringify(data.user));
      localStorage.setItem("adminEmail", data.user.email);
      setUser(data.user);
      toast.success(t("signup_success"));
      router.push("/admin/log-in");
    } catch {
      toast.error(t("google_error"));
    }
  };

  /* ---------- Facebook ---------- */
  const handleFacebookSignUp = () => {
    if (!window.FB) {
      toast.error(t("facebook_error"));
      return;
    }

    window.FB.login(
      async (response: fb.StatusResponse) => {
        if (!response.authResponse) {
          toast.error(t("facebook_error"));
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
                role: "ADMIN",
              }),
            }
          );

          const data = await res.json();
          if (!res.ok) {
            toast.error(data.message || t("facebook_error"));
            return;
          }

          localStorage.setItem("adminUser", JSON.stringify(data.user));
          localStorage.setItem("adminEmail", data.user.email);
          setUser(data.user);
          toast.success(t("signup_success"));
          router.push("/admin/log-in");
        } catch {
          toast.error(t("facebook_error"));
        }
      },
      { scope: "email,public_profile" }
    );
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex items-center justify-center gap-12 px-4">
      <div className="flex flex-col gap-6 w-full max-w-[416px]">
        <button
          onClick={() => router.back()}
          className="h-[44px] w-[44px] flex items-center justify-center rounded-md hover:bg-muted"
        >
          <ChevronLeft />
        </button>

        <div className="space-y-1.5">
          <h1 className="text-lg font-semibold">{t("create_account")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("create_account_sub")}
          </p>
        </div>

        <input
          value={user.email}
          onChange={(e) =>
            setUser((prev: any) => ({ ...prev, email: e.target.value }))
          }
          placeholder={t("email_placeholder")}
          className="h-[44px] rounded-md border border-border bg-background px-3 text-sm"
        />

        <button
          onClick={nextStep}
          className="h-[44px] w-full rounded-md bg-primary text-primary-foreground text-sm font-medium"
        >
          {t("lets_go")}
        </button>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="flex-1 h-px bg-border" />
          {t("or")}
          <span className="flex-1 h-px bg-border" />
        </div>

        <GoogleLogin
          onSuccess={handleGoogleSignUp}
          onError={() => toast.error(t("google_error"))}
        />

        {/* Facebook – brand color preserved */}
        <button
          onClick={handleFacebookSignUp}
          className="h-[44px] w-full rounded-md bg-[#1877F2] text-white font-medium"
        >
          {t("facebook_continue")}
        </button>

        <div className="flex gap-2 justify-center text-sm">
          <span className="text-muted-foreground">{t("have_account")}</span>
          <button
            onClick={() => router.push("/admin/log-in")}
            className="text-primary underline"
          >
            {t("login")}
          </button>
        </div>
      </div>

      {/* Desktop image only */}
      <div className="hidden lg:block">
        <img
          src="/deliverM.png"
          alt={t("login_image_alt")}
          className="max-w-[860px] w-full h-auto object-contain"
        />
      </div>
    </div>
  );
};
