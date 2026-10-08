/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { motion } from "framer-motion";
import { useEffect } from "react";
import { useI18n } from "@/components/i18n/ClientI18nProvider";

export const FoodSizes = ({
  sizes,
  selectedSize,
  setSelectedSize,
}: {
  sizes: any[];
  selectedSize: string | null;
  setSelectedSize: (s: string) => void;
}) => {
  const { t } = useI18n();

  useEffect(() => {
    if (!sizes || sizes.length === 0) return;
    if (!selectedSize) {
      const first = typeof sizes[0] === "string" ? sizes[0] : sizes[0]?.label;
      if (first) setSelectedSize(first);
    }
  }, [sizes, selectedSize, setSelectedSize]);

  if (!sizes || sizes.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t("size")}
      </h3>

      <div className="flex flex-wrap gap-2">
        {sizes.map((s, i) => {
          const label =
            typeof s === "string"
              ? s
              : typeof s === "object" && "label" in s
              ? s.label
              : "";

          const active = selectedSize === label;

          return (
            <motion.button
              key={i}
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => setSelectedSize(label)}
              className={`
                min-w-[44px] h-[44px] px-3 rounded-lg border text-sm font-medium transition-all
                ${active
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border hover:border-primary/50 hover:bg-muted"
                }
              `}
              aria-pressed={active}
            >
              {label}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
