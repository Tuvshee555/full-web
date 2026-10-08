"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";

export default function ResetPasswordPage() {
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/user/reset-password`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      }
    );

    if (res.ok) {
      toast.success(t("password_reset_success"));
      router.push("/admin/log-in");
    } else {
      toast.error(t("password_reset_error"));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
      <form
        onSubmit={handleSubmit}
        className="
          w-full max-w-sm
          bg-card
          border border-border
          rounded-xl
          p-6
          space-y-4
        "
      >
        <h2 className="text-base font-semibold">{t("reset_password")}</h2>

        <input
          type="password"
          placeholder={t("new_password_placeholder")}
          className="
            h-[44px]
            w-full
            rounded-md
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
          className="
            h-[44px]
            w-full
            rounded-md
            bg-primary
            text-primary-foreground
            text-sm
            font-medium
          "
        >
          {t("reset_password")}
        </button>
      </form>
    </div>
  );
}
