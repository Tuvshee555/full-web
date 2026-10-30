"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { AuthLanguage } from "@admin/components/AuthLanguage";
import { API_BASE_URL } from "@admin/lib/api";
import { STORE } from "@/config/store";

export default function ForgotPasswordPage() {
  const { t, locale } = useI18n();
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/user/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), locale }),
      });
      if (res.ok) setSent(true);
      else setError(t(res.status === 429 ? "auth.errors.too_many" : "auth.forgot_page.error"));
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
          {sent ? (
            <div role="status">
              <MailCheck aria-hidden className="h-[28px] w-[28px] text-[#3d4a34]" strokeWidth={1.6} />
              <h1 className="mt-[12px] text-[22px] font-semibold">{t("auth.forgot_page.sent_title")}</h1>
              <p className="mt-[6px] text-[14px] leading-relaxed text-taupe">{t("auth.forgot_page.sent_body", { email: email.trim() })}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-[16px]">
              <div>
                <h1 className="text-[22px] font-semibold">{t("auth.forgot_page.title")}</h1>
                <p className="mt-[6px] text-[14px] leading-relaxed text-taupe">{t("auth.forgot_page.body")}</p>
              </div>
              <div>
                <label htmlFor="forgot-email" className="admin-label">{t("auth.email")}</label>
                <input
                  id="forgot-email"
                  type="email"
                  placeholder={t("auth.email_placeholder")}
                  autoComplete="email"
                  disabled={pending}
                  className="field !h-[48px] !text-[16px]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={Boolean(error)}
                  required
                />
              </div>
              {error && <p role="alert" className="text-[14px] text-terracotta">{error}</p>}
              <button type="submit" disabled={pending} className="btn w-full !min-h-[48px]">
                {pending && <Loader2 aria-hidden className="h-[16px] w-[16px] animate-spin" />}
                {pending ? t("auth.forgot_page.sending") : t("auth.forgot_page.submit")}
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
