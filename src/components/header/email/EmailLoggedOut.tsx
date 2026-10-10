"use client";

import { GoogleLogin } from "@react-oauth/google";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import { useStoreT } from "@/components/store/lib/useStoreT";
import { handleFacebookLogin } from "./handlers/handleFacebookLogin";
import { handleGuestLogin } from "./handlers/handleGuestLogin";
import { handleGoogleLogin } from "./handlers/handleGoogleLogin";
import { useAuthDialog } from "./components/AuthDialogProvider";

export const EmailLoggedOut = ({ closeSheet }: { closeSheet: () => void }) => {
  const router = useRouter();
  const { t } = useI18n();
  const { st, locale } = useStoreT();
  const { open } = useAuthDialog();
  const redirect = "";

  return (
    <div className="flex flex-1 flex-col px-[24px] md:px-[30px]">
      <p className="store-heading text-[40px]">{st("log_in")}</p>
      <p className="mt-[6px] text-[14px] text-ink/60">{t("auth.sign_in_subtitle")}</p>

      <div className="mt-[28px] flex flex-col gap-[10px]">
        <button
          type="button"
          className="btn w-full"
          onClick={() => {
            closeSheet();
            open();
          }}
        >
          {t("login_with_email")}
        </button>

        <div className="my-[8px] flex items-center gap-[12px] text-[12px] text-ink/45">
          <span className="h-px flex-1 bg-ink/10" />
          {t("or")}
          <span className="h-px flex-1 bg-ink/10" />
        </div>

        <div className="flex justify-center [&>div]:w-full">
          <GoogleLogin
            width="360"
            shape="rectangular"
            text="continue_with"
            onSuccess={(cred) => {
              closeSheet();
              handleGoogleLogin(cred, redirect, router, locale);
            }}
            onError={() => toast.error(t("google_login_error"))}
          />
        </div>

        <button
          type="button"
          className="btn-secondary w-full"
          onClick={() => {
            closeSheet();
            handleFacebookLogin(redirect, router, locale);
          }}
        >
          {t("login_with_facebook")}
        </button>

        <button
          type="button"
          className="link-underline mt-[12px] self-center text-[14px] text-ink/70"
          onClick={() => {
            closeSheet();
            handleGuestLogin(redirect, router, locale);
          }}
        >
          {t("login_as_guest")}
        </button>
      </div>
    </div>
  );
};
