"use client";

import { API_BASE_URL } from "@/lib/api";
import { use, useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { FoodType } from "@/type/type";
import Link from "next/link";

import { FoodMedia } from "@/components/food/FoodMedia";
import { FoodInfo } from "@/components/foodInfo/FoodInfo";
import { SimilarFoods } from "@/components/food/SimilarFoods";
import { FoodReviews } from "@/components/review/FoodReviews";
import { sanitizeCategory, sanitizeFood, sanitizeFoodList } from "@/utils/catalogSanitizer";
import { useI18n } from "@/components/i18n/ClientI18nProvider";

async function getFood(id: string): Promise<FoodType | null> {
  const res = await fetch(`${API_BASE_URL}/food/${id}`, {
    cache: "no-store",
  });

  if (!res.ok) return null;
  const raw = await res.json();
  const normalized = sanitizeFood(raw);
  if (normalized?.category) {
    normalized.category = sanitizeCategory(normalized.category as any);
  }
  return normalized;
}

export default function FoodDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { locale } = useI18n();

  const [food, setFood] = useState<FoodType | null>(null);
  const [allFoods, setAllFoods] = useState<FoodType[]>([]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    (async () => {
      const data = await getFood(id);
      if (!data) notFound();
      setFood(data);

      const res = await fetch(`${API_BASE_URL}/food`, {
        cache: "no-store",
      });
      const all = await res.json();
      if (Array.isArray(all)) setAllFoods(sanitizeFoodList(all));
    })();
  }, [id]);

  if (!food) return null;

  const categoryName =
    typeof food.category === "object"
      ? (food.category as any)?.categoryName
      : undefined;
  const categoryId =
    (food as any).categoryId ??
    (typeof food.category === "object" ? (food.category as any)?.id : null);

  return (
    <main className="min-h-screen w-full bg-background text-foreground pt-0 lg:pt-[90px] pb-20">
      <section className="px-4 sm:px-6 lg:px-10 pt-4 lg:pt-6">
        <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
          <Link href={`/${locale}/home-page`} className="hover:text-foreground">
            Нүүр
          </Link>
          <span>/</span>
          {categoryId ? (
            <Link
              href={`/${locale}/category/${categoryId}`}
              className="hover:text-foreground"
            >
              {categoryName ?? "Ангилал"}
            </Link>
          ) : (
            <span>{categoryName ?? "Ангилал"}</span>
          )}
          <span>/</span>
          <span className="text-foreground">{food.foodName}</span>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-10 items-stretch px-0 lg:px-10">
        <FoodMedia food={food} />

        <div className="px-4 sm:px-6 lg:px-0">
          <FoodInfo food={food} />
        </div>
      </section>

      {/* ✅ Reviews (Vitals-style) */}
      <section className="px-4 sm:px-6 lg:px-10 mt-10">
        <FoodReviews foodId={food.id} />
      </section>

      <SimilarFoods food={food} allFoods={allFoods} />
    </main>
  );
}
