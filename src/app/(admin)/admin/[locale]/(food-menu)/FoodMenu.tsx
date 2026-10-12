"use client";

import { API_BASE_URL } from "@admin/lib/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { FolderTree, Plus, Search, X } from "lucide-react";

import { ALL, CategoryTree } from "./_components/categoryTree/CategoryTree";
import { ProductList } from "./_components/ProductList";
import { CategoryOption, ProductEditor } from "./_components/editor/ProductEditor";
import CategoryMobileSheet from "./_components/components/CategoryMobileSheet";
import { FoodType } from "@admin/type/type";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { useAuth } from "@admin/provider/AuthProvider";
import { CategoryNode } from "@admin/utils/categoryUtils";
import { Skeleton } from "@admin/components/ui/skeleton";

type Sort = "newest" | "name" | "price_low" | "price_high";

/** Category ids under (and including) each node, for "parent shows children's products". */
function descendantsMap(tree: CategoryNode[]) {
  const map = new Map<string, string[]>();
  const walk = (n: CategoryNode): string[] => {
    const ids = [n.id, ...(n.children ?? []).flatMap(walk)];
    map.set(n.id, ids);
    return ids;
  };
  tree.forEach(walk);
  return map;
}

function flattenWithDepth(tree: CategoryNode[], depth = 0): CategoryOption[] {
  return tree.flatMap((n) => [
    { id: n.id, name: n.categoryName, depth },
    ...flattenWithDepth(n.children ?? [], depth + 1),
  ]);
}

const time = (f: FoodType & { createdAt?: string }) => new Date(f.createdAt ?? 0).getTime();

export const FoodMenu = () => {
  const { t } = useI18n();
  const { token } = useAuth();

  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingFoods, setLoadingFoods] = useState(true);
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [foods, setFoods] = useState<FoodType[]>([]);
  const [selected, setSelected] = useState<string>(ALL);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editor, setEditor] = useState<{ open: boolean; food: FoodType | null }>({ open: false, food: null });

  const reloadCategories = useCallback(async () => {
    try {
      setLoadingCats(true);
      const res = await axios.get(`${API_BASE_URL}/category/tree`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTree(res.data || []);
    } catch {
      toast.error(t("error_loading"));
    } finally {
      setLoadingCats(false);
    }
  }, [token, t]);

  const reloadFoods = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/food/admin/inventory`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFoods(res.data || []);
    } catch {
      toast.error(t("editor.load_failed"));
    } finally {
      setLoadingFoods(false);
    }
  }, [token, t]);

  useEffect(() => {
    reloadCategories();
    reloadFoods();
  }, [reloadCategories, reloadFoods]);

  const options = useMemo(() => flattenWithDepth(tree), [tree]);
  const descendants = useMemo(() => descendantsMap(tree), [tree]);
  const nameById = useMemo(() => new Map(options.map((o) => [o.id, o.name])), [options]);

  // If the selected category was deleted, fall back to "all"
  useEffect(() => {
    if (selected !== ALL && !loadingCats && !nameById.has(selected)) setSelected(ALL);
  }, [selected, loadingCats, nameById]);

  const counts = useMemo(() => {
    const direct = new Map<string, number>();
    foods.forEach((f) => direct.set(f.categoryId, (direct.get(f.categoryId) ?? 0) + 1));
    const out: Record<string, number> = {};
    descendants.forEach((ids, id) => {
      out[id] = ids.reduce((s, x) => s + (direct.get(x) ?? 0), 0);
    });
    return out;
  }, [foods, descendants]);

  const visible = useMemo(() => {
    const inCat = selected === ALL ? null : new Set(descendants.get(selected) ?? [selected]);
    const q = query.trim().toLowerCase();
    const list = foods.filter(
      (f) => (!inCat || inCat.has(f.categoryId)) && (!q || f.foodName.toLowerCase().includes(q))
    );
    const by: Record<Sort, (a: FoodType, b: FoodType) => number> = {
      newest: (a, b) => time(b) - time(a),
      name: (a, b) => a.foodName.localeCompare(b.foodName),
      price_low: (a, b) => Number(a.price) - Number(b.price),
      price_high: (a, b) => Number(b.price) - Number(a.price),
    };
    return [...list].sort(by[sort]);
  }, [foods, selected, descendants, query, sort]);

  const toggleFeatured = async (food: FoodType) => {
    const next = !food.isFeatured;
    setFoods((prev) => prev.map((f) => (f.id === food.id ? { ...f, isFeatured: next } : f)));
    try {
      await axios.put(
        `${API_BASE_URL}/food/${String(food.id)}`,
        { isFeatured: next },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(next ? t("editor.featured_on") : t("editor.featured_off"));
    } catch {
      setFoods((prev) => prev.map((f) => (f.id === food.id ? { ...f, isFeatured: !next } : f)));
      toast.error(t("update_failed"));
    }
  };

  const selectedName = selected === ALL ? t("editor.all_products") : nameById.get(selected) ?? "";
  const loading = loadingFoods || loadingCats;

  const treeProps = {
    tree,
    loading: loadingCats,
    counts,
    totalCount: foods.length,
    selectedId: selected,
    onChanged: () => {
      reloadCategories();
      reloadFoods();
    },
  };

  return (
    <div className="w-full">
      {/* Page header */}
      <div className="mb-[24px] flex flex-wrap items-end justify-between gap-[16px]">
        <div>
          <h1 className="store-heading text-[36px] md:text-[44px]">{t("sidebar.food_menu")}</h1>
          <p className="mt-[6px] text-[13px] text-taupe">{t("editor.page_hint", { count: foods.length })}</p>
        </div>
        <button
          type="button"
          onClick={() => setEditor({ open: true, food: null })}
          className="btn w-full sm:w-auto"
        >
          <Plus className="h-[16px] w-[16px]" />
          {t("food.add_modal.title")}
        </button>
      </div>

      <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-[28px]">
        {/* Desktop categories */}
        <aside className="hidden self-start lg:sticky lg:top-[28px] lg:block">
          <CategoryTree {...treeProps} onSelect={setSelected} />
        </aside>

        <section className="min-w-0">
          {/* Mobile: category picker + manage */}
          <div className="mb-[12px] flex gap-[8px] lg:hidden">
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="h-[44px] min-w-0 flex-1 cursor-pointer border border-ink/20 bg-white px-[12px] text-[14px] text-ink"
              aria-label={t("category.title")}
            >
              <option value={ALL}>
                {t("editor.all_products")} ({foods.length})
              </option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {"   ".repeat(o.depth)}
                  {o.name} ({counts[o.id] ?? 0})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="btn-secondary !px-[14px]"
              aria-label={t("editor.manage_categories")}
              title={t("editor.manage_categories")}
            >
              <FolderTree className="h-[17px] w-[17px]" strokeWidth={1.4} />
            </button>
          </div>

          {/* Toolbar */}
          <div className="mb-[12px] flex flex-col gap-[8px] sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-[12px] top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-taupe" strokeWidth={1.5} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("editor.search_placeholder")}
                className="h-[44px] w-full border border-ink/20 bg-white pl-[38px] pr-[38px] text-[14px] text-ink outline-none placeholder:text-ink/40 focus:border-ink"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label={t("clear")}
                  className="absolute right-[6px] top-1/2 flex h-[32px] w-[32px] -translate-y-1/2 items-center justify-center text-taupe hover:text-ink"
                >
                  <X className="h-[15px] w-[15px]" />
                </button>
              )}
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="h-[44px] cursor-pointer border border-ink/20 bg-white px-[12px] text-[14px] text-ink sm:w-[200px]"
              aria-label={t("editor.sort")}
            >
              <option value="newest">{t("editor.sort_newest")}</option>
              <option value="name">{t("editor.sort_name")}</option>
              <option value="price_low">{t("editor.sort_price_low")}</option>
              <option value="price_high">{t("editor.sort_price_high")}</option>
            </select>
          </div>

          <div className="mb-[10px] flex items-baseline justify-between gap-[12px]">
            <h2 className="store-heading truncate text-[24px]">{selectedName}</h2>
            <span className="shrink-0 text-[13px] text-taupe">{t("dish_count", { count: visible.length })}</span>
          </div>

          {loading ? (
            <div className="space-y-[1px] border border-ink/10 bg-white">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-[14px] px-[16px] py-[10px]">
                  <Skeleton className="h-[64px] w-[64px] rounded-none" />
                  <div className="flex-1 space-y-[8px]">
                    <Skeleton className="h-[14px] w-1/3 rounded-none" />
                    <Skeleton className="h-[12px] w-1/2 rounded-none" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ProductList
              foods={visible}
              showCategory={selected === ALL || (descendants.get(selected)?.length ?? 1) > 1}
              categoryName={(id) => nameById.get(id) ?? "—"}
              onEdit={(food) => setEditor({ open: true, food })}
              onToggleFeatured={toggleFeatured}
              emptyText={query ? t("editor.no_search_results") : t("no_category_foods")}
            />
          )}
        </section>
      </div>

      <CategoryMobileSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
        <div className="p-[16px]">
          <CategoryTree
            {...treeProps}
            onSelect={(id) => {
              setSelected(id);
              setSheetOpen(false);
            }}
          />
        </div>
      </CategoryMobileSheet>

      <ProductEditor
        open={editor.open}
        onOpenChange={(open) => setEditor((e) => ({ ...e, open }))}
        food={editor.food}
        categories={options}
        defaultCategoryId={selected === ALL ? null : selected}
        onSaved={() => {
          reloadFoods();
          reloadCategories();
        }}
      />
    </div>
  );
};
