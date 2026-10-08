/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { GoogleLogin } from "@react-oauth/google";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";

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

export const LoginForm = ({
  user,
  setUser,
  showPassword,
  setShowPassword,
  error,
  loading,
  onLogin,
  onGoogle,
  onFacebook,
}: Props) => {
  const { t } = useI18n();
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6 w-full max-w-[416px]">
      <button
        type="button"
        onClick={() => router.push("/admin")}
        className="h-[44px] w-[44px] flex items-center justify-center rounded-md hover:bg-muted"
      >
        <ChevronLeft />
      </button>

      <div className="space-y-1.5">
        <h1 className="text-lg font-semibold">{t("login")}</h1>
        <p className="text-sm text-muted-foreground">{t("login_subtitle")}</p>
      </div>

      <form onSubmit={onLogin} className="flex flex-col gap-4">
        <input
          type="email"
          placeholder={t("email_placeholder")}
          value={user.email}
          onChange={(e) =>
            setUser((p: any) => ({ ...p, email: e.target.value }))
          }
          className="h-[44px] rounded-md border border-border bg-background px-3 text-sm"
        />

        <input
          type={showPassword ? "text" : "password"}
          placeholder={t("password")}
          value={user.password}
          onChange={(e) =>
            setUser((p: any) => ({ ...p, password: e.target.value }))
          }
          className="h-[44px] rounded-md border border-border bg-background px-3 text-sm"
        />

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showPassword}
            onChange={() => setShowPassword(!showPassword)}
          />
          {t("show_password")}
        </label>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button
          type="button"
          onClick={() => router.push("/admin/forgot-password")}
          className="text-sm underline text-left"
        >
          {t("forgot_password")}
        </button>

        <button
          disabled={loading}
          className="
            h-[44px]
            rounded-md
            bg-primary
            text-primary-foreground
            text-sm
            font-medium
            disabled:opacity-50
          "
        >
          {loading ? t("logging_in") : t("login")}
        </button>

        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <span className="flex-1 h-px bg-border" />
          {t("or")}
          <span className="flex-1 h-px bg-border" />
        </div>

        <GoogleLogin
          onSuccess={onGoogle}
          onError={() => toast.error(t("google_error"))}
        />

        {/* Facebook – brand color preserved */}
        <button
          type="button"
          onClick={onFacebook}
          className="
            h-[44px]
            rounded-md
            text-white
            font-medium
            bg-[#1877F2]
          "
        >
          {t("facebook_continue")}
        </button>
      </form>

      <div className="flex gap-2 justify-center text-sm">
        <span className="text-muted-foreground">{t("no_account")}</span>
        <button
          type="button"
          onClick={() => router.push("/admin/sign-up")}
          className="text-primary underline"
        >
          {t("sign_up")}
        </button>
      </div>
    </div>
  );
};
