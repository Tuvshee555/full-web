"use client";

import { useI18n } from "@admin/components/i18n/ClientI18nProvider";

type Category = {
  _id: string;
  categoryName: string;
  foodCount: number;
};

type CategoryListProps = {
  category?: Category[];
  loading: boolean;
};

export const CategoryNameList = ({
  category = [],
  loading,
}: CategoryListProps) => {
  const { t } = useI18n();

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
    );
  }

  if (category.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("category.empty")}</p>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-wrap gap-4">
        {category.map((c) => (
          <div
            key={c._id}
            className="
              flex items-center gap-2
              rounded-full
              border border-border
              px-4 py-2
              text-sm
              bg-background
              text-foreground
            "
          >
            <span>{c.categoryName}</span>
            <span className="text-muted-foreground">{c.foodCount}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
