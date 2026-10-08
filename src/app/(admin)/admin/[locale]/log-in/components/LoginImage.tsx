/* eslint-disable @next/next/no-img-element */
"use client";

import { useI18n } from "@admin/components/i18n/ClientI18nProvider";

export const LoginImage = () => {
  const { t } = useI18n();

  return (
    <img
      src="/deliverM.png"
      alt={t("login_image_alt")}
      className="
        max-w-[860px]
        w-full
        h-auto
        object-contain
      "
    />
  );
};
