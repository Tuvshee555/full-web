/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

import { useCategory } from "@/hooks/useCategory";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import { FoodCard } from "../FoodCard";
import { useFood } from "@/hooks/useFood";
import { fadeUp, staggerContainer } from "@/utils/animations";

export const FoodCategoryList = () => {
  const { locale, t } = useI18n();

  const { data: categories = [], isLoading: categoryLoading } = useCategory();
  const { data: foods = [], isLoading: foodLoading } = useFood();

  const isLoading = categoryLoading || foodLoading;

  const getMediaUrl = (media?: string | File): string => {
    if (!media) return "/placeholder.png";
    return typeof media === "string" ? media : URL.createObjectURL(media);
  };

  if (isLoading) {
    return (
      <section className="w-full px-4 mt-10">
        <p className="text-sm text-muted-foreground">{t("loading")}...</p>
      </section>
    );
  }

  return (
    <section className="w-full">
      <div className="max-w-7xl px-4 mx-auto flex flex-col gap-16 mt-10 pb-16">
        {categories
          .filter((cat) => cat.parentId === null)
          .map((cat) => {
            const catId = cat.id;
            const filteredFood = foods.filter(
              (dish) => dish.category === catId || dish.categoryId === catId
            );

            if (filteredFood.length === 0) return null;

            const firstFoodImage =
              cat.imageUrl
                ? getMediaUrl(cat.imageUrl)
                : filteredFood.length > 0
                ? getMediaUrl(filteredFood[0].image)
                : "/order1.png";

            return (
              <motion.section
                key={catId}
                className="w-full"
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-80px" }}
              >
                {/* Section header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-1 flex items-center gap-2">
                      <img
                        src={firstFoodImage}
                        alt={cat.categoryName}
                        className="w-5 h-5 rounded object-cover border border-border inline-block"
                      />
                      {t("categories")}
                    </p>
                    <h2 className="text-2xl font-bold tracking-tight">
                      {cat.categoryName || t("unknown_category")}
                    </h2>
                  </div>

                  <Link
                    href={`/${locale}/category/${catId}`}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t("view_all")} <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

                {/* Product grid */}
                <motion.div
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
                  variants={staggerContainer}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, margin: "-50px" }}
                >
                  {filteredFood.map((dish) => (
                    <FoodCard key={dish.id} food={dish} />
                  ))}
                </motion.div>
              </motion.section>
            );
          })}
      </div>
    </section>
  );
};

export default FoodCategoryList;
