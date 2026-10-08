/* eslint-disable @next/next/no-img-element */
"use client";

import { SignUpEmailStepType } from "@admin/type/type";
import { ChevronLeft, Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";

export const CreatePassword = ({
  nextStep,
  stepBack,
  setUser,
  user,
}: SignUpEmailStepType) => {
  const { t } = useI18n();
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTouched, setIsTouched] = useState(false);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUser((prev) => ({ ...prev, password: e.target.value }));
    setIsTouched(true);
  };

  const handleConfirmPasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setUser((prev) => ({ ...prev, repassword: e.target.value }));
    setIsTouched(true);
  };

  useEffect(() => {
    validatePasswords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const validatePasswords = () => {
    const { password, repassword } = user;
    const passwordRegex = /^\d{6}$/;

    if (!password) {
      setError(t("password_required"));
    } else if (!passwordRegex.test(password)) {
      setError(t("password_rule"));
    } else if (repassword && password !== repassword) {
      setError(t("password_mismatch"));
    } else {
      setError(null);
    }
  };

  const handleSubmit = () => {
    if (!error) nextStep();
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex items-center justify-center gap-12 px-4">
      <div className="flex flex-col gap-6 w-full max-w-[416px]">
        <button
          onClick={stepBack}
          className="h-[44px] w-[44px] flex items-center justify-center rounded-md hover:bg-muted"
        >
          <ChevronLeft />
        </button>

        <div className="space-y-1.5">
          <h1 className="text-lg font-semibold">{t("create_password")}</h1>
          <p className="text-sm text-muted-foreground">{t("password_hint")}</p>
        </div>

        {/* Password */}
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder={t("password_placeholder")}
            value={user.password}
            onChange={handlePasswordChange}
            className="h-[44px] w-full rounded-md border border-border bg-background px-3 pr-10 text-sm"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* Confirm password */}
        <div className="relative">
          <input
            type={showConfirmPassword ? "text" : "password"}
            placeholder={t("confirm_password_placeholder")}
            value={user.repassword}
            onChange={handleConfirmPasswordChange}
            className="h-[44px] w-full rounded-md border border-border bg-background px-3 pr-10 text-sm"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* Error */}
        {isTouched && error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!!error}
          className="
            h-[44px]
            w-full
            rounded-md
            bg-primary
            text-primary-foreground
            text-sm
            font-medium
            disabled:opacity-50
          "
        >
          {t("continue")}
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

      {/* Desktop illustration */}
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
