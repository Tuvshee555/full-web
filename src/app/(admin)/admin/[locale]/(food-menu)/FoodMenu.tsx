"use client";

import { API_BASE_URL } from "@admin/lib/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";

import { CategoryTree } from "./_components/categoryTree/CategoryTree";
import { FoodCategoryList } from "./_components/FoodCategoryList";
import { FoodType } from "@admin/type/type";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { useAuth } from "@admin/provider/AuthProvider";
import CategorySelectorButton from "./_components/components/CategorySelectorButton";
import CategoryMobileSheet from "./_components/components/CategoryMobileSheet";
import { flattenTree, CategoryNode } from "@admin/utils/categoryUtils";
import { Skeleton } from "@admin/components/ui/skeleton";

export const FoodMenu = () => {
  const { t } = useI18n();
  const { token } = useAuth();

  const [loadingCats, setLoadingCats] = useState(false);
  const [loadingFoods, setLoadingFoods] = useState(false);
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [flatCats, setFlatCats] = useState<CategoryNode[]>([]);
  const [foods, setFoods] = useState<FoodType[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const reloadCategories = useCallback(async () => {
    try {
      setLoadingCats(true);
      const res = await axios.get(
        `${API_BASE_URL}/category/tree`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data: CategoryNode[] = res.data || [];
      setTree(data);

      const flat = flattenTree(data);
      setFlatCats(flat);

      // Only auto-select the first category on initial load
      setSelectedCategoryId((prev) => (prev ? prev : flat[0]?.id ?? null));
    } finally {
      setLoadingCats(false);
    }
  }, [token]);

  const reloadFoods = useCallback(async () => {
    try {
      setLoadingFoods(true);
      const res = await axios.get(
        `${API_BASE_URL}/food`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFoods(res.data || []);
    } finally {
      setLoadingFoods(false);
    }
  }, [token]);

  useEffect(() => {
    Promise.all([reloadCategories(), reloadFoods()]);
  }, [reloadCategories, reloadFoods]);

  const selectedCategory = useMemo(
    () => flatCats.find((c) => c.id === selectedCategoryId) ?? null,
    [flatCats, selectedCategoryId]
  );

  const foodsInSelectedCategory = useMemo(() => {
    if (!selectedCategoryId) return [];
    return foods.filter((f) => f.categoryId === selectedCategoryId);
  }, [foods, selectedCategoryId]);

  const foodLoadingGrid = (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <Skeleton key={i} className="h-[240px] w-full rounded-none" />
      ))}
    </div>
  );

  const mainContent = () => {
    if (loadingFoods) return foodLoadingGrid;
    if (!selectedCategory) {
      return (
        <div className="bg-card border border-border rounded-none p-8">
          <p className="text-sm text-muted-foreground">
            {t("select_category_hint")}
          </p>
        </div>
      );
    }
    return (
      <FoodCategoryList
        category={{ ...selectedCategory, foodCount: selectedCategory.foodCount ?? 0 }}
        foodData={foodsInSelectedCategory}
        refreshFood={reloadFoods}
      />
    );
  };

  return (
    <div className="w-full min-h-screen text-foreground">
      <h1 className="store-heading mb-[24px] text-[44px]">{t("sidebar.food_menu")}</h1>
      <div>
        {/* Desktop: left category tree */}
        <div className="hidden lg:grid lg:grid-cols-[300px_1fr] lg:gap-[24px]">
          <aside className="w-[300px] bg-card border border-border rounded-none p-4">
            <CategoryTree
              tree={tree}
              loading={loadingCats}
              selectedId={selectedCategoryId}
              onSelect={setSelectedCategoryId}
              onChanged={reloadCategories}
            />
          </aside>

          <main className="flex-1">{mainContent()}</main>
        </div>

        {/* Mobile / tablet: category selector + content */}
        <div className="lg:hidden">
          <div className="mb-4">
            <CategorySelectorButton
              selected={selectedCategory}
              onOpen={() => setSheetOpen(true)}
            />
          </div>

          <main>{mainContent()}</main>
        </div>
      </div>

      <CategoryMobileSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
        <div className="p-4">
          <h3 className="text-sm font-semibold mb-3">{t("categories")}</h3>
          <div className="max-h-[60vh] overflow-auto pr-2">
            <CategoryTree
              tree={tree}
              loading={loadingCats}
              selectedId={selectedCategoryId}
              onSelect={(id) => {
                setSelectedCategoryId(id);
                setSheetOpen(false);
              }}
              onChanged={reloadCategories}
            />
          </div>
        </div>
      </CategoryMobileSheet>
    </div>
  );
};
