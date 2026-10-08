"use client";

import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { Button } from "@admin/components/ui/button";

interface Props {
  loading: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}

export const AddFoodFooter = ({ loading, onCancel, onSubmit }: Props) => {
  const { t } = useI18n();

  return (
    <div className="flex gap-3 mt-6">
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        className="flex-1 h-[44px]"
      >
        {t("common.cancel")}
      </Button>

      <Button
        type="button"
        onClick={onSubmit}
        disabled={loading}
        className="flex-1 h-[44px]"
      >
        {loading ? t("common.adding") : t("common.add")}
      </Button>
    </div>
  );
};
