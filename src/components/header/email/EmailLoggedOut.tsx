"use client";

import { GoogleLogin } from "@react-oauth/google";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { handleFacebookLogin } from "./handlers/handleFacebookLogin";
import { handleGuestLogin } from "./handlers/handleGuestLogin";
import { handleGoogleLogin } from "./handlers/handleGoogleLogin";

import { useLocale, useI18n } from "@/components/i18n/ClientI18nProvider";
import { useAuthDialog } from "./components/AuthDialogProvider";

interface EmailLoggedOutProps {
  closeSheet: () => void;
}

export const EmailLoggedOut = ({ closeSheet }: EmailLoggedOutProps) => {
  const router = useRouter();
  const { t } = useI18n();
  const locale = useLocale();
  const { open } = useAuthDialog(); // ✅ GLOBAL DIALOG

  const redirect = "/home-page";

  return (
    <div className="px-6 py-10 flex flex-col gap-6">
      {/* EMAIL LOGIN */}
      <button
        onClick={() => {
          closeSheet(); // sheet closes
          open(); // auth dialog opens (SURVIVES)
        }}
        className="w-full py-3 border border-border rounded-xl
                   text-foreground hover:bg-muted transition"
      >
        {t("login_with_email")}
      </button>

      {/* DIVIDER */}
      <div className="flex items-center my-2">
        <div className="flex-1 border-t border-border" />
        <span className="px-4 text-muted-foreground text-sm">{t("or")}</span>
        <div className="flex-1 border-t border-border" />
      </div>

      {/* GOOGLE */}
      {/* GOOGLE */}
      <div className="flex justify-center">
        <div className="w-full max-w-sm [&>div]:w-full">
          <GoogleLogin
            onSuccess={(cred) => {
              closeSheet();
              handleGoogleLogin(cred, redirect, router, locale);
            }}
            onError={() => toast.error(t("google_login_error"))}
          />
        </div>
      </div>

      {/* FACEBOOK */}
      <button
        onClick={() => {
          closeSheet();
          handleFacebookLogin(redirect, router, locale);
        }}
        className="w-full bg-[#1877F2] text-white py-3 rounded-xl font-semibold
                   hover:bg-[#145dbf] transition"
      >
        {t("login_with_facebook")}
      </button>

      {/* GUEST */}
      <button
        onClick={() => {
          closeSheet();
          handleGuestLogin(redirect, router, locale);
        }}
        className="w-full border border-border py-3 rounded-xl font-semibold
                   text-foreground hover:bg-muted transition"
      >
        {t("login_as_guest")}
      </button>
    </div>
  );
};
