/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { ResponsiveGoogleLogin } from "@/components/ResponsiveGoogleLogin";
import { toast } from "sonner";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { STORE } from "@/config/store";
import { AuthLanguage } from "@admin/components/AuthLanguage";

type Props = {
  user: { email: string; password: string; role: string };
  setUser: React.Dispatch<React.SetStateAction<any>>;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  error: string | null;
  loading: boolean;
  onLogin: (e: React.FormEvent) => void;
  onGoogle: (res: any) => void;
};

export const LoginForm = ({ user, setUser, showPassword, setShowPassword, error, loading, onLogin, onGoogle }: Props) => {
  const { t, locale } = useI18n();

  return (
    <div className="w-full max-w-[400px]">
      <div className="flex items-center justify-between gap-[12px]">
        <span className="store-heading text-[26px] lg:hidden">{STORE.name}</span>
        <AuthLanguage />
      </div>
      <h1 className="mt-[24px] text-[28px] font-semibold tracking-tight">{t("auth.login_title")}</h1>
      <p className="mt-[6px] text-[15px] text-taupe">{t("auth.login_subtitle")}</p>

      <form onSubmit={onLogin} className="mt-[28px] flex flex-col gap-[14px]" noValidate={false}>
        <div>
          <label htmlFor="login-email" className="admin-label">{t("auth.email")}</label>
          <input
            id="login-email"
            type="email"
            placeholder={t("auth.email_placeholder")}
            value={user.email}
            onChange={(e) => setUser((p: any) => ({ ...p, email: e.target.value }))}
            className="field !h-[48px] !text-[16px]"
            autoComplete="email"
            required
            disabled={loading}
            aria-invalid={Boolean(error)}
          />
        </div>
        <div>
          <div className="flex items-baseline justify-between gap-[12px]">
            <label htmlFor="login-password" className="admin-label">{t("auth.password")}</label>
            <Link href={`/admin/${locale}/forgot-password`} className="text-[13px] text-taupe underline underline-offset-[3px] hover:text-ink">
              {t("auth.forgot")}
            </Link>
          </div>
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            value={user.password}
            onChange={(e) => setUser((p: any) => ({ ...p, password: e.target.value }))}
            className="field !h-[48px] !text-[16px]"
            autoComplete="current-password"
            required
            disabled={loading}
            aria-invalid={Boolean(error)}
          />
          <label className="mt-[4px] flex min-h-[44px] w-fit cursor-pointer items-center gap-[8px] text-[13px] text-taupe">
            <input type="checkbox" checked={showPassword} onChange={() => setShowPassword(!showPassword)} className="h-[16px] w-[16px] accent-ink" />
            {t("auth.show_password")}
          </label>
        </div>

        {error && <p role="alert" className="border border-terracotta/30 bg-terracotta/[0.04] px-[12px] py-[10px] text-[14px] text-terracotta">{error}</p>}

        <button disabled={loading} className="btn w-full !min-h-[48px]">
          {loading && <Loader2 aria-hidden className="h-[16px] w-[16px] animate-spin" />}
          {loading ? t("auth.logging_in") : t("auth.login")}
        </button>

        <div className="my-[4px] flex items-center gap-[12px] text-[12px] text-taupe">
          <span className="h-px flex-1 bg-ink/10" />
          {t("auth.or")}
          <span className="h-px flex-1 bg-ink/10" />
        </div>

        <div className="[&>div]:w-full">
          <ResponsiveGoogleLogin shape="rectangular" onSuccess={onGoogle} onError={() => toast.error(t("auth.errors.google"))} />
        </div>
      </form>
    </div>
  );
};
