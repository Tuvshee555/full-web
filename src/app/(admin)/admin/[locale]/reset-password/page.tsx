"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { AuthLanguage } from "@admin/components/AuthLanguage";
import { API_BASE_URL } from "@admin/lib/api";
import { STORE } from "@/config/store";

const MIN_LENGTH = 8;

export default function ResetPasswordPage() {
  const { t, locale } = useI18n();
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams?.get("token");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending || !token) return;
    if (password.length < MIN_LENGTH) return setError(t("auth.reset_page.too_short", { min: MIN_LENGTH }));
    if (password !== repeat) return setError(t("auth.reset_page.mismatch"));
    setPending(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/user/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      if (res.ok) {
        toast.success(t("auth.reset_page.done"));
        router.replace(`/admin/${locale}/log-in`);
      } else {
        setError(t(res.status === 429 ? "auth.errors.too_many" : "auth.reset_page.expired"));
      }
    } catch {
      setError(t("common.errors.offline"));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-paper px-[16px] py-[40px] text-ink">
      <div className="w-full max-w-[420px]">
        <div className="mb-[16px] flex items-center justify-between gap-[12px]">
          <span className="store-heading text-[26px]">{STORE.name}</span>
          <AuthLanguage />
        </div>
        <div className="admin-surface p-[24px]">
          {!token ? (
            <div role="alert">
              <h1 className="text-[22px] font-semibold">{t("auth.reset_page.title")}</h1>
              <p className="mt-[6px] text-[14px] leading-relaxed text-terracotta">{t("auth.reset_page.expired")}</p>
              <Link href={`/admin/${locale}/forgot-password`} className="btn-secondary mt-[16px]">{t("auth.reset_page.new_link")}</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-[16px]">
              <div>
                <h1 className="text-[22px] font-semibold">{t("auth.reset_page.title")}</h1>
                <p className="mt-[6px] text-[14px] leading-relaxed text-taupe">{t("auth.reset_page.body", { min: MIN_LENGTH })}</p>
              </div>
              <div>
                <label htmlFor="reset-password" className="admin-label">{t("auth.reset_page.new")}</label>
                <input
                  id="reset-password"
                  type={show ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={MIN_LENGTH}
                  disabled={pending}
                  className="field !h-[48px] !text-[16px]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-describedby="reset-hint"
                  required
                />
                <p id="reset-hint" className="admin-hint">{t("auth.reset_page.hint", { min: MIN_LENGTH })}</p>
              </div>
              <div>
                <label htmlFor="reset-repeat" className="admin-label">{t("auth.reset_page.repeat")}</label>
                <input
                  id="reset-repeat"
                  type={show ? "text" : "password"}
                  autoComplete="new-password"
                  disabled={pending}
                  className="field !h-[48px] !text-[16px]"
                  value={repeat}
                  onChange={(e) => setRepeat(e.target.value)}
                  required
                />
                <label className="mt-[4px] flex min-h-[44px] w-fit cursor-pointer items-center gap-[8px] text-[13px] text-taupe">
                  <input type="checkbox" checked={show} onChange={() => setShow(!show)} className="h-[16px] w-[16px] accent-ink" />
                  {t("auth.show_password")}
                </label>
              </div>
              {error && <p role="alert" className="text-[14px] text-terracotta">{error}</p>}
              <button type="submit" disabled={pending} className="btn w-full !min-h-[48px]">
                {pending && <Loader2 aria-hidden className="h-[16px] w-[16px] animate-spin" />}
                {pending ? t("auth.reset_page.saving") : t("auth.reset_page.submit")}
              </button>
            </form>
          )}
        </div>
        <Link href={`/admin/${locale}/log-in`} className="mt-[12px] inline-flex min-h-[44px] items-center gap-[6px] text-[14px] text-taupe underline-offset-4 hover:text-ink hover:underline">
          <ArrowLeft aria-hidden className="h-[15px] w-[15px]" />
          {t("auth.back_to_login")}
        </Link>
      </div>
    </div>
  );
}
