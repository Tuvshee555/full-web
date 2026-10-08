/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { FoodType } from "@/type/type";
import { FoodCard } from "@/components/FoodCard";
import React from "react";
import { useI18n } from "@/components/i18n/ClientI18nProvider";

/** Normalize any id-like value */
const normalizeId = (v: any): string | null => {
  if (v == null) return null;
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (typeof v === "object") {
    if ("id" in v) return String(v.id);
    if ("categoryId" in v) return String(v.categoryId);
  }
  return null;
};

export const SimilarFoods = ({
  food,
  allFoods,
}: {
  food: FoodType;
  allFoods: FoodType[];
}) => {
  const { t, locale } = useI18n();

  const currentCategory = normalizeId(
    (food as any).categoryId ?? (food as any).category?.id
  );

  const currentFoodId = normalizeId((food as any).id);

  const similar = (allFoods || []).filter((item) => {
    const itemId = normalizeId((item as any).id);
    const itemCategory =
      normalizeId((item as any).categoryId ?? (item as any).category?.id) ?? "";

    return (
      itemId !== currentFoodId &&
      itemCategory !== "" &&
      currentCategory === itemCategory
    );
  });

  return (
    <section
      className="
  max-w-7xl mx-auto
  mt-20
  px-6 md:px-10
  pb-[15px] sm:pb-0
"
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl md:text-2xl font-semibold text-white">
          {t("similar_products")}
        </h2>

        {currentCategory && (
          <Link
            href={`/${locale}/category/${currentCategory}`} // 🔥 FIXED
            className="flex items-center gap-1 text-gray-400 text-sm hover:text-[#facc15] transition"
          >
            {t("view_more")} →
          </Link>
        )}
      </div>

      {similar.length === 0 ? (
        <h2 className="text-xl pt-7 md:text-2xl font-semibold text-gray-400 text-center">
          {t("no_similar_products")}
        </h2>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
          {similar.map((item) => (
            <FoodCard
              key={normalizeId((item as any).id) || Math.random()}
              food={item}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default SimilarFoods;
