"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { API_BASE_URL } from "@admin/lib/api";

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
      const res = await fetch(
      `${API_BASE_URL}/user/forgot-password`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), locale }),
      }
    );

    if (res.ok) {
      setSent(true);
    } else {
      setError(t("reset_email_error"));
    }
    } catch {
      setError(t("reset_email_error"));
      toast.error(t("reset_email_error"));
    } finally { setPending(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
      <form
        onSubmit={handleSubmit}
        className="
          w-full max-w-sm
          bg-card
          border border-border
          rounded-none
          p-6
          space-y-4
        "
      >
        <h1 className="text-xl font-semibold">{t("forgot_password")}</h1>
        {sent ? <p role="status" className="text-sm text-ink">{t("reset_email_sent")}</p> : <>

        <input
          type="email"
          placeholder={t("email_placeholder")}
          aria-label={t("email_placeholder")}
          autoComplete="email"
          disabled={pending}
          className="
            h-[44px]
            w-full
            rounded-none
            border border-border
            bg-background
            px-3
            text-sm
          "
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <button
          type="submit"
          disabled={pending}
          className="
            h-[44px]
            w-full
            rounded-none
            bg-primary
            text-primary-foreground
            text-sm
            font-medium
          "
        >
          {pending ? t("common.loading") : t("send_reset_link")}
        </button>
        {error && <p role="alert" className="text-sm text-terracotta">{error}</p>}
        </>}
        <Link href={`/admin/${locale}/log-in`} className="inline-flex min-h-[44px] items-center text-sm underline underline-offset-4">{t("login")}</Link>
      </form>
    </div>
  );
}
