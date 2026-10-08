"use client";

import { useCallback } from "react";
import { useI18n } from "@/components/i18n/ClientI18nProvider";

/** t() for the "store" message block, with {placeholder} interpolation. */
export function useStoreT() {
  const { t, locale } = useI18n();
  const st = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      let s = t(`store.${key}`);
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
      return s;
    },
    [t],
  );
  return { st, locale };
}
