"use client";

import { PackageX } from "lucide-react";
import { FoodCard } from "./FoodCard";
import { AddFoodButton } from "./AddFoodButton";
import { FoodCategoryListPropsType } from "@admin/type/type";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";

export const FoodCategoryList: React.FC<FoodCategoryListPropsType> = ({
  category,
  foodData,
  refreshFood,
}) => {
  const { t } = useI18n();

  const categoryId = category.id;
  const foodsInCategory = foodData.filter((f) => f.categoryId === categoryId);

  return (
    <section
      className="
        bg-card
        text-foreground
        border border-border
        rounded-none
        p-5
        flex flex-col
        gap-4
      "
    >
      <h2 className="store-heading text-[32px]">
        {category.categoryName}
        <span className="ml-[8px] font-store text-[13px] font-normal tracking-normal text-muted-foreground">
          ({foodsInCategory.length} {t("items_short")})
        </span>
      </h2>

      <div
        className="
          grid
          grid-cols-1
          sm:grid-cols-2
          md:grid-cols-2
          lg:grid-cols-3
          xl:grid-cols-4
          gap-4
        "
      >
        <AddFoodButton category={category} refreshFood={refreshFood} />

        {foodsInCategory.map((food) => (
          <FoodCard
            key={food.id}
            food={food}
            category={category}
            refreshFood={refreshFood}
          />
        ))}
      </div>

      {foodsInCategory.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-muted-foreground">
          <PackageX className="w-8 h-8 opacity-40" />
          <p className="text-sm">{t("no_category_foods")}</p>
        </div>
      )}
    </section>
  );
};
