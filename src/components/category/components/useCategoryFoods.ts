"use client";

import { API_BASE_URL } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";
import { FoodType } from "@/type/type";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import {
  sanitizeCategory,
  sanitizeFoodList,
} from "@/utils/catalogSanitizer";

type SortType = "newest" | "oldest" | "low" | "high";

type Filters = {
  discount: boolean;
  featured: boolean;
  bestseller: boolean;
};

const PER_PAGE = 8;

// ⚠️ With derived sales, 20 may be too high.
// You can tune this later.
const BESTSELLER_THRESHOLD = 5;

const isDiscounted = (item: FoodType) => Number(item.discount ?? 0) > 0;

const isFeatured = (item: FoodType) => Boolean(item.isFeatured);

// salesCount now comes from backend (derived)
const isBestseller = (item: FoodType) =>
  Number(item.salesCount ?? 0) >= BESTSELLER_THRESHOLD;

export function useCategoryLogic(id: string) {
  const { t } = useI18n();

  const [foods, setFoods] = useState<FoodType[]>([]);
  const [categoryName, setCategoryName] = useState(t("category"));
  const [page, setPage] = useState(1);
  const [sortType, setSortType] = useState<SortType>("newest");
  const [isLoading, setIsLoading] = useState(true);

  const [filters, setFilters] = useState<Filters>({
    discount: false,
    featured: false,
    bestseller: false,
  });

  const toggleFilter = (k: keyof Filters) =>
    setFilters((p) => ({ ...p, [k]: !p[k] }));

  /* -------------------------------------------------- */
  /* 🔒 ROUTE-DRIVEN FILTER PRESETS                      */
  /* -------------------------------------------------- */
  useEffect(() => {
    if (id === "bestseller") {
      setFilters({
        discount: false,
        featured: false,
        bestseller: true,
      });
      setCategoryName(t("footer_bestseller"));
      return;
    }

    if (id === "featured") {
      setFilters({
        discount: false,
        featured: true,
        bestseller: false,
      });
      setCategoryName(t("footer_featured"));
      return;
    }

    if (id === "discounted") {
      setFilters({
        discount: true,
        featured: false,
        bestseller: false,
      });
      setCategoryName(t("footer_discounted"));
      return;
    }

    if (id === "all") {
      setFilters({
        discount: false,
        featured: false,
        bestseller: false,
      });
      setCategoryName(t("all_products"));
    }
  }, [id, t]);

  /* -------------------------------------------------- */
  /* 📡 FETCH DATA                                      */
  /* -------------------------------------------------- */
  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);

    async function run() {
      try {
        // virtual categories
        if (["all", "featured", "discounted", "bestseller"].includes(id)) {
          const res = await fetch(
            `${API_BASE_URL}/food`,
            { signal: controller.signal },
          );
          const data = await res.json();
          setFoods(sanitizeFoodList(Array.isArray(data) ? data : []));
          return;
        }

        // real category
        const res = await fetch(
          `${API_BASE_URL}/category/${id}/foods-tree`,
          { signal: controller.signal },
        );
        const json = await res.json();

        setFoods(sanitizeFoodList(json?.foods ?? []));
        setCategoryName(
          sanitizeCategory(json?.category ?? { categoryName: t("category") })
            .categoryName ?? t("category"),
        );
      } catch {
        setFoods([]);
      } finally {
        setIsLoading(false);
      }
    }

    run();
    return () => controller.abort();
  }, [id, t]);

  /* -------------------------------------------------- */
  /* 🔄 RESET PAGE ON STATE CHANGE                      */
  /* -------------------------------------------------- */
  useEffect(() => {
    setPage(1);
  }, [filters, sortType, id]);

  /* -------------------------------------------------- */
  /* ✅ FILTERING                                      */
  /* -------------------------------------------------- */
  const filteredFoods = useMemo(() => {
    return foods.filter((f) => {
      if (filters.discount && !isDiscounted(f)) return false;
      if (filters.featured && !isFeatured(f)) return false;
      if (filters.bestseller && !isBestseller(f)) return false;
      return true;
    });
  }, [foods, filters]);

  /* -------------------------------------------------- */
  /* 🔃 SORTING                                       */
  /* -------------------------------------------------- */
  const sortedFoods = useMemo(() => {
    return [...filteredFoods].sort((a, b) => {
      if (sortType === "low") return a.price - b.price;
      if (sortType === "high") return b.price - a.price;

      const da = new Date(a.createdAt).getTime();
      const db = new Date(b.createdAt).getTime();
      return sortType === "oldest" ? da - db : db - da;
    });
  }, [filteredFoods, sortType]);

  const totalPages = Math.max(1, Math.ceil(sortedFoods.length / PER_PAGE));

  const pagedFoods = sortedFoods.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return {
    foods,
    filteredFoods,
    pagedFoods,
    page,
    totalPages,
    filters,
    categoryName,
    setPage,
    setSortType,
    toggleFilter,
    isLoading,
  };
}
