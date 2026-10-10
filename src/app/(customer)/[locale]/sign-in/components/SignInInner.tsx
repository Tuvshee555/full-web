/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import AuthDrawer from "@/components/AuthDrawer";
import { STORE } from "@/config/store";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import { googleLogin, facebookLogin, guestLogin } from "./helpers";

export const dynamic = "force-dynamic";

export default function SignInPageInner() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const redirectUrl = params.get("redirect") || `/${locale}`;
  const [openEmail, setOpenEmail] = useState(false);

  return (
    <div className="page-width flex min-h-[70vh] justify-center pb-[96px] pt-[56px] md:pt-[96px]">
      <div className="w-full max-w-[420px]">
        <span className="eyebrow">{STORE.name}</span>
        <h1 className="store-heading mt-[10px] text-[52px] md:text-[64px]">{t("auth.sign_in")}</h1>
        <p className="mt-[8px] text-[15px] text-ink/60">{t("auth.sign_in_subtitle")}</p>

        <div className="mt-[36px] flex flex-col gap-[10px]">
          <button type="button" onClick={() => setOpenEmail(true)} className="btn w-full">
            {t("auth.sign_in_email")}
          </button>

          <div className="my-[8px] flex items-center gap-[12px] text-[12px] text-ink/45">
            <span className="h-px flex-1 bg-ink/10" />
            {t("auth.or")}
            <span className="h-px flex-1 bg-ink/10" />
          </div>

          <div className="flex justify-center [&>div]:w-full">
            <GoogleLogin
              width="420"
              shape="rectangular"
              text="continue_with"
              onSuccess={(cred: CredentialResponse) => googleLogin(cred, redirectUrl, router.push)}
            />
          </div>

          <button
            type="button"
            className="btn-secondary w-full"
            onClick={() => window.FB?.login((res: any) => facebookLogin(res, redirectUrl, router.push), { scope: "email,public_profile" })}
          >
            {t("auth.sign_in_facebook")}
          </button>

          <button type="button" onClick={() => guestLogin(redirectUrl, router.push)} className="link-underline mt-[12px] self-center text-[14px] text-ink/70">
            {t("auth.sign_in_guest")}
          </button>
        </div>

        <p className="mt-[40px] text-[12px] leading-relaxed text-ink/50">{t("auth.terms_notice")}</p>
      </div>

      <AuthDrawer open={openEmail} onClose={() => setOpenEmail(false)} />
    </div>
  );
}
