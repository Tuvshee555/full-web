/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { ShareButton } from "@/components/ShareButton";
import { useI18n } from "@/components/i18n/ClientI18nProvider";

export const FoodAddress = ({ foodName }: { foodName: string }) => {
  const { t, locale } = useI18n();

  const shareUrl =
    typeof window !== "undefined"
      ? window.location.href
      : `/${locale}/food/${encodeURIComponent(foodName)}`;

  return (
    <div className="flex justify-end items-center text-gray-300 text-sm pt-5 border-t border-gray-800 mt-6">
      <ShareButton title={foodName} url={shareUrl} />
    </div>
  );
};
