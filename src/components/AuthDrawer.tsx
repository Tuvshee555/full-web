"use client";

import { API_BASE_URL } from "@/lib/api";
import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/(customer)/[locale]/provider/AuthProvider";
import { useI18n } from "@/components/i18n/ClientI18nProvider";

export default function AuthDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { setAuthToken } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<"idle" | "otp">("idle");
  const [loading, setLoading] = useState(false);
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  /* ================= LOGIC (UNCHANGED) ================= */

  const sendOTP = async () => {
    const normalized = email.trim().toLowerCase();

    if (!/^\S+@\S+\.\S+$/.test(normalized)) {
      toast.error(t("auth.invalid_email"));
      return;
    }

    setLoading(true);
    const res = await fetch(
      `${API_BASE_URL}/email/send-otp`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized }),
      }
    );
    setLoading(false);

    if (!res.ok) {
      toast.error(t("auth.otp_send_failed"));
      return;
    }

    toast.success(t("auth.otp_sent"));
    setPhase("otp");
    setTimeout(() => inputsRef.current[0]?.focus(), 50);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const paste = e.clipboardData.getData("text");
    if (/^\d{6}$/.test(paste)) {
      const arr = paste.split("");
      setDigits(arr);
      autoVerify(arr.join(""));
    }
  };

  const handleDigitChange = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;

    const next = [...digits];
    next[i] = val;
    setDigits(next);

    if (val && i < 5) inputsRef.current[i + 1]?.focus();

    if (next.join("").length === 6) autoVerify(next.join(""));
  };

  const autoVerify = async (code: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;

    const res = await fetch(
      `${API_BASE_URL}/email/verify-otp`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, code }),
      }
    );

    if (!res.ok) {
      setIsCorrect(false);
      return;
    }

    const data = await res.json();
    setIsCorrect(true);

    localStorage.setItem("userId", data.user.id);
    setAuthToken(data.token, data.user.email);

    toast.success(t("auth.login_success"));
    onClose();

    const redirect =
      new URLSearchParams(window.location.search).get("redirect") ||
      "/home-page";

    router.push(redirect);
  };

  if (!open) return null;

  /* ================= UI ================= */

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="bg"
        className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        key="modal"
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="w-full max-w-lg rounded-3xl bg-card border border-border p-6 sm:p-8 text-foreground shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">{t("auth.login_title")}</h2>
            <button
              onClick={onClose}
              aria-label={t("common.close")}
              className="h-[44px] w-[44px] rounded-md text-muted-foreground hover:bg-muted"
            >
              ×
            </button>
          </div>

          {/* PHASE: EMAIL */}
          {phase === "idle" && (
            <div className="space-y-4">
              <label className="text-sm text-muted-foreground">
                {t("auth.email")}
              </label>

              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("auth.email_placeholder")}
                className="h-[44px] w-full rounded-xl border border-border bg-background px-4 text-sm"
              />

              <button
                onClick={sendOTP}
                disabled={loading}
                className="h-[44px] w-full rounded-xl bg-foreground text-background text-sm font-medium disabled:opacity-60"
              >
                {loading ? t("common.loading") : t("common.continue")}
              </button>
            </div>
          )}

          {/* PHASE: OTP */}
          {phase === "otp" && (
            <div className="space-y-4">
              <label className="text-sm text-muted-foreground">
                {t("auth.otp")}
              </label>

              <div className="flex justify-center gap-2">
                {digits.map((d, i) => (
                  <motion.input
                    key={i}
                    ref={(el) => {
                      inputsRef.current[i] = el;
                    }}
                    value={d}
                    maxLength={1}
                    onPaste={handlePaste}
                    onChange={(e) => handleDigitChange(i, e.target.value)}
                    className={`h-[44px] w-[44px] rounded-md border text-center text-sm
                      ${
                        isCorrect === true
                          ? "border-foreground"
                          : isCorrect === false
                          ? "border-destructive"
                          : "border-border"
                      }`}
                    animate={
                      isCorrect === false ? { x: [-4, 4, -4, 4, 0] } : {}
                    }
                  />
                ))}
              </div>

              <p className="max-w-prose text-center text-sm leading-relaxed text-muted-foreground">
                {email}
                {t("auth.otp_sent_to")}
              </p>

              <div className="flex justify-between">
                <button
                  onClick={() => {
                    setPhase("idle");
                    setDigits(Array(6).fill(""));
                  }}
                  className="h-[44px] px-4 rounded-md border border-border text-sm"
                >
                  {t("common.back")}
                </button>

                <button
                  onClick={sendOTP}
                  className="h-[44px] px-2 text-sm underline text-muted-foreground"
                >
                  {t("auth.resend")}
                </button>
              </div>

              <button
                onClick={() => autoVerify(digits.join(""))}
                className="h-[44px] w-full rounded-xl bg-foreground text-background text-sm font-medium"
              >
                {t("common.verify")}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
