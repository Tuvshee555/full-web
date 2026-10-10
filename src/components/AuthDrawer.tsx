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

    // Stay where the shopper is unless a redirect was requested (was "/home-page")
    const redirect = new URLSearchParams(window.location.search).get("redirect");
    if (redirect) router.push(redirect);
  };

  if (!open) return null;

  /* ================= UI ================= */

  return (
    <AnimatePresence>
      {/* Backdrop */}
      {/* Above the sticky header (z-90) and drawers (z-1000) */}
      <motion.div
        key="bg"
        className="fixed inset-0 z-[1100] bg-espresso/40 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        key="modal"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
        className="pointer-events-none fixed inset-0 z-[1101] flex items-center justify-center p-[16px]"
      >
        <div className="pointer-events-auto w-full max-w-[440px] bg-paper p-[28px] text-ink shadow-[0_40px_80px_-30px_rgba(28,23,20,0.45)] sm:p-[36px]">
          <div className="flex items-start justify-between">
            <h2 className="store-heading text-[36px]">{t("auth.login_title")}</h2>
            <button
              onClick={onClose}
              aria-label={t("common.close")}
              className="-mr-[10px] -mt-[6px] p-[10px] text-[22px] leading-none text-ink/60 transition-transform duration-500 hover:rotate-90 hover:text-ink"
            >
              ×
            </button>
          </div>

          {phase === "idle" && (
            <div className="mt-[24px] space-y-[14px]">
              <div className="field">
                <input
                  id="auth-email"
                  type="email"
                  placeholder=" "
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendOTP()}
                  autoComplete="email"
                />
                <label htmlFor="auth-email">{t("auth.email")}</label>
              </div>
              <button onClick={sendOTP} disabled={loading} className="btn w-full">
                {loading ? t("common.loading") : t("common.continue")}
              </button>
            </div>
          )}

          {phase === "otp" && (
            <div className="mt-[24px] space-y-[18px]">
              <p className="text-[14px] leading-relaxed text-ink/60">
                <span className="text-ink">{email}</span>
                {t("auth.otp_sent_to")}
              </p>

              <div className="flex justify-between gap-[8px]">
                {digits.map((d, i) => (
                  <motion.input
                    key={i}
                    ref={(el) => {
                      inputsRef.current[i] = el;
                    }}
                    value={d}
                    inputMode="numeric"
                    maxLength={1}
                    onPaste={handlePaste}
                    onChange={(e) => handleDigitChange(i, e.target.value)}
                    className={`h-[56px] w-full bg-white text-center text-[20px] text-ink outline-none ${
                      isCorrect === true
                        ? "shadow-[inset_0_0_0_1px_#1c1714]"
                        : isCorrect === false
                          ? "shadow-[inset_0_0_0_1px_#a8452f]"
                          : "shadow-[inset_0_0_0_1px_rgba(28,23,20,0.2)] focus:shadow-[inset_0_0_0_1px_#1c1714]"
                    }`}
                    animate={isCorrect === false ? { x: [-4, 4, -4, 4, 0] } : {}}
                  />
                ))}
              </div>

              <button onClick={() => autoVerify(digits.join(""))} className="btn w-full">
                {t("common.verify")}
              </button>

              <div className="flex justify-between text-[14px]">
                <button
                  onClick={() => {
                    setPhase("idle");
                    setDigits(Array(6).fill(""));
                  }}
                  className="link-underline text-ink/70"
                >
                  {t("common.back")}
                </button>
                <button onClick={sendOTP} className="link-underline text-ink/70">
                  {t("auth.resend")}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
