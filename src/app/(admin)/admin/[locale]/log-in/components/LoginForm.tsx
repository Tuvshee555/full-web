/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { GoogleLogin } from "@react-oauth/google";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { STORE } from "@/config/store";

type Props = {
  user: { email: string; password: string; role: string };
  setUser: React.Dispatch<React.SetStateAction<any>>;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  error: string | null;
  loading: boolean;
  onLogin: (e: React.FormEvent) => void;
  onGoogle: (res: any) => void;
  onFacebook: () => void;
};

const input =
  "h-[50px] w-full bg-white px-[14px] text-[15px] text-ink outline-none shadow-[inset_0_0_0_1px_rgba(28,23,20,0.18)] transition-shadow focus:shadow-[inset_0_0_0_1px_#1c1714] placeholder:text-ink/40";

export const LoginForm = ({ user, setUser, showPassword, setShowPassword, error, loading, onLogin, onGoogle, onFacebook }: Props) => {
  const { t } = useI18n();
  const router = useRouter();

  return (
    <div className="w-full max-w-[400px]">
      <span className="eyebrow">{STORE.name} · Admin</span>
      <h1 className="store-heading mt-[10px] text-[56px]">{t("login")}</h1>
      <p className="mt-[6px] text-[15px] text-ink/60">{t("login_subtitle")}</p>

      <form onSubmit={onLogin} className="mt-[32px] flex flex-col gap-[12px]">
        <input
          type="email"
          placeholder={t("email_placeholder")}
          value={user.email}
          onChange={(e) => setUser((p: any) => ({ ...p, email: e.target.value }))}
          className={input}
          autoComplete="email"
        />
        <input
          type={showPassword ? "text" : "password"}
          placeholder={t("password")}
          value={user.password}
          onChange={(e) => setUser((p: any) => ({ ...p, password: e.target.value }))}
          className={input}
          autoComplete="current-password"
        />

        <div className="flex items-center justify-between text-[13px]">
          <label className="flex cursor-pointer items-center gap-[8px] text-ink/70">
            <input type="checkbox" checked={showPassword} onChange={() => setShowPassword(!showPassword)} className="accent-ink" />
            {t("show_password")}
          </label>
          <button type="button" onClick={() => router.push("/admin/forgot-password")} className="text-ink/70 underline underline-offset-[3px] hover:text-ink">
            {t("forgot_password")}
          </button>
        </div>

        {error && <p className="text-[13px] text-terracotta">{error}</p>}

        <button disabled={loading} className="btn mt-[6px] w-full !min-h-[50px]">
          {loading ? t("logging_in") : t("login")}
        </button>

        <div className="my-[6px] flex items-center gap-[12px] text-[12px] text-ink/45">
          <span className="h-px flex-1 bg-ink/10" />
          {t("or")}
          <span className="h-px flex-1 bg-ink/10" />
        </div>

        <div className="[&>div]:w-full">
          <GoogleLogin width="400" shape="rectangular" onSuccess={onGoogle} onError={() => toast.error(t("google_error"))} />
        </div>
        <button type="button" onClick={onFacebook} className="btn-secondary w-full !min-h-[50px]">
          {t("facebook_continue")}
        </button>
      </form>

      <p className="mt-[28px] text-[13px] text-ink/60">
        {t("no_account")}{" "}
        <button type="button" onClick={() => router.push("/admin/sign-up")} className="text-ink underline underline-offset-[3px]">
          {t("sign_up")}
        </button>
      </p>
    </div>
  );
};
