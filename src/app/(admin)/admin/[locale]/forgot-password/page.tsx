"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/user/forgot-password`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }
    );

    if (res.ok) {
      toast.success(t("reset_email_sent"));
      router.push("/admin/log-in");
    } else {
      toast.error(t("reset_email_error"));
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
          rounded-none
          p-6
          space-y-4
        "
      >
        <h2 className="text-base font-semibold">{t("forgot_password")}</h2>

        <input
          type="email"
          placeholder={t("email_placeholder")}
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
          {t("send_reset_link")}
        </button>
      </form>
    </div>
  );
}
