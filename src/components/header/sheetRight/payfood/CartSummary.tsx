"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n/ClientI18nProvider";

type Props = {
  total: number;
};

export const CartSummary = ({ total }: Props) => {
  const router = useRouter();
  const { locale, t } = useI18n();

  return (
    <div className="">
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm font-medium text-muted-foreground">
          {t("grand_total")}
        </span>
        <span className="text-lg font-semibold text-foreground">
          ₮ {total.toLocaleString()}
        </span>
      </div>

      <Button
        onClick={() => router.push(`/${locale}/checkout`)}
        className="w-full h-[44px] text-sm font-medium"
      >
        {t("checkout")}
      </Button>
    </div>
  );
};
