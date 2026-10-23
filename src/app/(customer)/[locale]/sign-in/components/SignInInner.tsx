"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type CredentialResponse } from "@react-oauth/google";
import { ResponsiveGoogleLogin } from "@/components/ResponsiveGoogleLogin";
import AuthDrawer from "@/components/AuthDrawer";
import { safeReturnPath } from "@/utils/safeRedirect";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import { googleLogin, guestLogin } from "./helpers";

export const dynamic = "force-dynamic";

export default function SignInPageInner() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const redirectUrl = safeReturnPath(params?.get("redirect"), `/${locale}`);
  const [openEmail, setOpenEmail] = useState(false);

  return (
    <div className="page-width flex min-h-[70vh] justify-center pb-[96px] pt-[56px] md:pt-[96px]">
      <div className="w-full max-w-[420px]">
        <h1 className="store-heading page-title">{t("auth.sign_in")}</h1>
        <p className="mt-[8px] text-[15px] text-ink/60">{t("auth.sign_in_subtitle")}</p>

        <div className="mt-[36px] flex flex-col gap-[10px]">
          <button type="button" onClick={() => setOpenEmail(true)} className="btn w-full">
            {t("auth.sign_in_email")}
          </button>

          <div className="my-[8px] flex items-center gap-[12px] text-[12px] text-ink/60">
            <span className="h-px flex-1 bg-ink/10" />
            {t("auth.or")}
            <span className="h-px flex-1 bg-ink/10" />
          </div>

          <div className="flex justify-center [&>div]:w-full">
            <ResponsiveGoogleLogin
              shape="rectangular"
              text="continue_with"
              onSuccess={(cred: CredentialResponse) => googleLogin(cred, redirectUrl, router.push)}
            />
          </div>

          <button type="button" onClick={() => guestLogin(redirectUrl, router.push)} className="link-underline mt-[12px] inline-flex min-h-[44px] items-center self-center text-[14px] text-ink/70">
            {t("auth.sign_in_guest")}
          </button>
        </div>

        <p className="mt-[40px] text-[12px] leading-relaxed text-ink/65">{t("auth.terms_notice")}</p>
        <p className="mt-[4px] flex flex-wrap gap-x-[16px] text-[12px] text-ink/65">
          <Link href={`/${locale}/terms`} className="inline-flex min-h-[44px] items-center underline underline-offset-[2px] hover:text-ink">{t("terms_of_service")}</Link>
          <Link href={`/${locale}/privacy`} className="inline-flex min-h-[44px] items-center underline underline-offset-[2px] hover:text-ink">{t("privacy_policy")}</Link>
        </p>
      </div>

      <AuthDrawer open={openEmail} onClose={() => setOpenEmail(false)} />
    </div>
  );
}
