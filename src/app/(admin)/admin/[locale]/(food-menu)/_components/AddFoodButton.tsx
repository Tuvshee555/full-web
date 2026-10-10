"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { AddFoodModel } from "./addFood/AddFoodModel";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";

interface AddFoodButtonProps {
  category: {
    id: string;
    categoryName: string;
  };
  refreshFood: () => void;
}

export const AddFoodButton: React.FC<AddFoodButtonProps> = ({
  category,
  refreshFood,
}) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border-2 border-dashed border-border rounded-none min-h-[240px] flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-muted/30 transition-all text-muted-foreground hover:text-primary w-full"
      >
        <Plus className="w-8 h-8" />
        <span className="text-sm font-medium">{t("food.add_modal.title")}</span>
      </button>

      {open && (
        <AddFoodModel
          category={category}
          closeModal={() => setOpen(false)}
          refreshFood={refreshFood}
        />
      )}
    </>
  );
};
