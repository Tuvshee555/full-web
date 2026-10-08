"use client";

import { QRCodeCanvas } from "qrcode.react";
import { motion } from "framer-motion";

export function PaymentStatusCard({
  t,
  qrText,
  paid,
  status,
}: {
  t: (k: string) => string;
  qrText?: string | null;
  paid?: boolean;
  status?: string | null;
}) {
  return (
    <section className="bg-card border rounded-2xl p-8 flex flex-col items-center gap-[22px] shadow-sm">
      {!paid ? (
        !qrText ? (
          <>
            <motion.div
              className="w-10 h-10 rounded-full border-4 border-muted border-t-primary"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            />
            <p className="text-sm text-muted-foreground">
              {t("generating_qr")}
            </p>
          </>
        ) : (
          <>
            <div className="bg-white p-4 rounded-xl shadow-inner">
              <QRCodeCanvas value={qrText} size={220} />
            </div>

            <p className="text-sm font-medium text-muted-foreground">QPay</p>

            <a
              href={`https://qpay.mn/q?q=${encodeURIComponent(qrText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center px-6 rounded-md bg-primary text-primary-foreground text-sm font-medium shadow-md hover:opacity-90 transition"
            >
              {t("pay_with_qpay")}
            </a>

            {status && (
              <motion.p
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="text-xs text-muted-foreground"
              >
                {status}
              </motion.p>
            )}
          </>
        )
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="flex flex-col items-center gap-4"
        >
          {/* Green success circle */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.25 }}
            className="relative"
          >
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ delay: 0.4, duration: 0.6, ease: "easeOut" }}
              className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center"
            >
              {/* SVG checkmark */}
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgb(34 197 94)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <motion.path
                  d="M20 6L9 17l-5-5"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                />
              </svg>
            </motion.div>
          </motion.div>

          {/* Success text */}
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="font-semibold text-green-600"
          >
            {t("payment_success")}
          </motion.p>
        </motion.div>
      )}
    </section>
  );
}
