"use client";

import { API_BASE_URL } from "@/lib/api";
import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/(customer)/[locale]/provider/AuthProvider";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import { safeReturnPath } from "@/utils/safeRedirect";

export default function AuthDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const { setAuthToken } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<"idle" | "otp">("idle");
  const [loading, setLoading] = useState(false);
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const sending = useRef(false);
  const verifying = useRef(false);
  const [verificationBusy, setVerificationBusy] = useState(false);

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const returnFocus = useRef<HTMLElement | null>(null);

  const sendOTP = async () => {
    if (sending.current || verifying.current) return;
    const normalized = email.trim().toLowerCase();

    if (!/^\S+@\S+\.\S+$/.test(normalized)) {
      toast.error(t("auth.invalid_email"));
      return;
    }

    sending.current = true;
    setLoading(true);
    try {
    const res = await fetch(
      `${API_BASE_URL}/email/send-otp`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized }),
        signal: AbortSignal.timeout(25_000),
      }
    );

    if (!res.ok) {
      toast.error(t("auth.otp_send_failed"));
      return;
    }

    toast.success(t("auth.otp_sent"));
    setDigits(Array(6).fill(""));
    setIsCorrect(null);
    setPhase("otp");
    setTimeout(() => inputsRef.current[0]?.focus(), 50);
    } catch { toast.error(t("auth.otp_send_failed")); }
    finally { sending.current = false; setLoading(false); }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const paste = e.clipboardData.getData("text");
    if (/^\d{6}$/.test(paste)) {
      e.preventDefault();
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
    if (verifying.current || !/^\d{6}$/.test(code)) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;
    verifying.current = true;
    setVerificationBusy(true);
    try {
    const res = await fetch(
      `${API_BASE_URL}/email/verify-otp`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, code }),
        signal: AbortSignal.timeout(25_000),
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
    if (redirect) router.push(safeReturnPath(redirect, `/${locale}`));
    } catch { toast.error(t("auth.login_error")); }
    finally { verifying.current = false; setVerificationBusy(false); }
  };

  if (!open) return null;

  /* ================= UI ================= */

  return (
    <Dialog.Root open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-modal bg-espresso/40" />
        <Dialog.Content onOpenAutoFocus={() => { returnFocus.current = document.activeElement as HTMLElement; }} onCloseAutoFocus={(event) => { event.preventDefault(); returnFocus.current?.focus(); }} aria-describedby={undefined} className="fixed left-1/2 top-1/2 z-modal-panel max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-[440px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto bg-paper p-[24px] text-ink shadow-xl outline-none sm:p-[36px]">
          <div className="flex items-start justify-between gap-[12px]">
            <Dialog.Title className="store-heading text-[36px]">{t("auth.login_title")}</Dialog.Title>
            <Dialog.Close aria-label={t("common.close")} className="-mr-[10px] -mt-[6px] flex h-[44px] w-[44px] shrink-0 items-center justify-center text-[26px] text-taupe">×</Dialog.Close>
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
                    autoComplete={i === 0 ? "one-time-code" : "off"}
                    disabled={verificationBusy}
                    maxLength={1}
                    onPaste={handlePaste}
                    onChange={(e) => handleDigitChange(i, e.target.value)}
                    aria-label={`${t("common.verify")} ${i + 1}`}
                    className={`h-[56px] min-w-0 w-full bg-white text-center text-[20px] text-ink outline-none ${
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

              <button disabled={verificationBusy || digits.join("").length !== 6} onClick={() => autoVerify(digits.join(""))} className="btn w-full">
                {verificationBusy ? t("common.loading") : t("common.verify")}
              </button>

              <div className="flex justify-between text-[14px]">
                <button
                  onClick={() => {
                    setPhase("idle");
                    setDigits(Array(6).fill(""));
                  }}
                  className="link-underline min-h-[44px] text-ink/70"
                >
                  {t("common.back")}
                </button>
                <button disabled={loading || verificationBusy} onClick={sendOTP} className="link-underline min-h-[44px] text-ink/70 disabled:opacity-50">
                  {t("auth.resend")}
                </button>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
