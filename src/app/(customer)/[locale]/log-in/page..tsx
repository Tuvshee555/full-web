/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import AuthDrawer from "@/components/AuthDrawer";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import {
  facebookLogin,
  googleLogin,
  guestLogin,
} from "../sign-in/components/helpers";

// declare global {
//   interface Window {
//     FB: any;
//   }
// }

export const dynamic = "force-dynamic";

export default function LogIn() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const redirectUrl = params.get("redirect") || "/home-page";

  const [openEmail, setOpenEmail] = useState(false);

  return (
    <div className="min-h-screen w-full bg-background text-foreground px-6 pt-28 pb-12 flex flex-col items-center">
      <div className="w-full max-w-md text-center mb-8 space-y-1.5">
        <h1 className="text-3xl font-semibold">{t("auth.sign_in")}</h1>
        <p className="text-muted-foreground text-sm">
          {t("auth.sign_in_subtitle")}
        </p>
      </div>

      <div className="w-full max-w-md flex flex-col gap-5">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setOpenEmail(true)}
          className="w-full h-[44px] rounded-md bg-card border border-border text-sm font-medium"
        >
          {t("auth.sign_in_email")}
        </motion.button>

        <AuthDrawer open={openEmail} onClose={() => setOpenEmail(false)} />

        <div className="flex items-center my-2">
          <div className="flex-1 border-t border-border" />
          <span className="px-3 text-muted-foreground text-xs">
            {t("auth.or")}
          </span>
          <div className="flex-1 border-t border-border" />
        </div>

        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={(cred: CredentialResponse) =>
              googleLogin(cred, redirectUrl, router.push)
            }
          />
        </div>

        {/* ⬇️ ONLY CHANGE IS HERE */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() =>
            window.FB?.login(
              (res: any) => facebookLogin(res, redirectUrl, router.push),
              { scope: "email,public_profile" }
            )
          }
          className="w-full h-[44px] rounded-md bg-primary text-primary-foreground text-sm font-medium"
        >
          {t("auth.sign_in_facebook")}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => guestLogin(redirectUrl, router.push)}
          className="w-full h-[44px] rounded-md border border-border text-sm font-medium"
        >
          {t("auth.sign_in_guest")}
        </motion.button>
      </div>

      <p className="text-center text-muted-foreground text-xs mt-8 max-w-prose leading-relaxed">
        {t("auth.terms_notice")}
      </p>
    </div>
  );
}
