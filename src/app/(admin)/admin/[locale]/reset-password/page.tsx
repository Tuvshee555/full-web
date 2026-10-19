"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { API_BASE_URL } from "@admin/lib/api";

export default function ResetPasswordPage() {
  const { t, locale } = useI18n();
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams?.get("token");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending || !token) return;
    setPending(true);
    setError("");
    try {
      const res = await fetch(
      `${API_BASE_URL}/user/reset-password`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      }
    );

    if (res.ok) {
      toast.success(t("password_reset_success"));
      router.replace(`/admin/${locale}/log-in`);
    } else {
      setError(t("password_reset_error"));
    }
    } catch { setError(t("password_reset_error")); }
    finally { setPending(false); }
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
        <h1 className="text-xl font-semibold">{t("reset_password")}</h1>
        {!token ? <p role="alert" className="text-sm text-terracotta">{t("password_reset_error")}</p> : <>

        <input
          type="password"
          placeholder={t("new_password_placeholder")}
          aria-label={t("new_password_placeholder")}
          autoComplete="new-password"
          minLength={8}
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
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
          {pending ? t("common.loading") : t("reset_password")}
        </button>
        {error && <p role="alert" className="text-sm text-terracotta">{error}</p>}
        </>}
        <Link href={`/admin/${locale}/forgot-password`} className="inline-flex min-h-[44px] items-center text-sm underline underline-offset-4">{t("send_reset_link")}</Link>
      </form>
    </div>
  );
}
