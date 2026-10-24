"use client";

import { API_BASE_URL } from "@admin/lib/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { FolderTree, Plus, Search, X } from "lucide-react";

import { ALL, CategoryTree } from "./_components/categoryTree/CategoryTree";
import { ProductList } from "./_components/ProductList";
import { CategoryOption, ProductEditor } from "./_components/editor/ProductEditor";
import CategoryMobileSheet from "./_components/components/CategoryMobileSheet";
import { ProductType } from "@admin/type/type";
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

const time = (f: ProductType & { createdAt?: string }) => new Date(f.createdAt ?? 0).getTime();

export const ProductCatalog = () => {
  const { t } = useI18n();
  const { token } = useAuth();

  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [products, setProducts] = useState<ProductType[]>([]);
  const [selected, setSelected] = useState<string>(ALL);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [availability, setAvailability] = useState("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editor, setEditor] = useState<{ open: boolean; product: ProductType | null }>({ open: false, product: null });
  const [categoryError, setCategoryError] = useState(false);
  const [productError, setProductError] = useState(false);
  const [featuredBusy, setFeaturedBusy] = useState<string[]>([]);
  const featuredRequests = useRef(new Set<string>());

  const reloadCategories = useCallback(async () => {
    try {
      setLoadingCats(true);
      const res = await axios.get(`${API_BASE_URL}/category/tree`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTree(Array.isArray(res.data) ? res.data : []);
      setCategoryError(false);
    } catch {
      setCategoryError(true);
      toast.error(t("error_loading"));
    } finally {
      setLoadingCats(false);
    }
  }, [token, t]);

  const reloadProducts = useCallback(async () => {
    try {
      setLoadingProducts(true);
      const res = await axios.get(`${API_BASE_URL}/products/admin/inventory`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts(Array.isArray(res.data) ? res.data : []);
      setProductError(false);
    } catch {
      setProductError(true);
      toast.error(t("editor.load_failed"));
    } finally {
      setLoadingProducts(false);
    }
  }, [token, t]);

  useEffect(() => {
    if (!token) return;
    reloadCategories();
    reloadProducts();
  }, [token, reloadCategories, reloadProducts]);

  const options = useMemo(() => flattenWithDepth(tree), [tree]);
  const descendants = useMemo(() => descendantsMap(tree), [tree]);
  const nameById = useMemo(() => new Map(options.map((o) => [o.id, o.name])), [options]);

  // If the selected category was deleted, fall back to "all"
  useEffect(() => {
    if (selected !== ALL && !loadingCats && !nameById.has(selected)) setSelected(ALL);
  }, [selected, loadingCats, nameById]);

  const counts = useMemo(() => {
    const direct = new Map<string, number>();
    products.forEach((f) => direct.set(f.categoryId, (direct.get(f.categoryId) ?? 0) + 1));
    const out: Record<string, number> = {};
    descendants.forEach((ids, id) => {
      out[id] = ids.reduce((s, x) => s + (direct.get(x) ?? 0), 0);
    });
    return out;
  }, [products, descendants]);

  const visible = useMemo(() => {
    const inCat = selected === ALL ? null : new Set(descendants.get(selected) ?? [selected]);
    const q = query.trim().toLowerCase();
    const list = products.filter(
      (f) => (!inCat || inCat.has(f.categoryId)) && (!q || `${f.productName} ${f.ingredients}`.toLowerCase().includes(q)) && (availability === "all" || (availability === "available" ? f.stockLevel !== "soldout" : f.stockLevel === availability))
    );
    const by: Record<Sort, (a: ProductType, b: ProductType) => number> = {
      newest: (a, b) => time(b) - time(a),
      name: (a, b) => a.productName.localeCompare(b.productName),
      price_low: (a, b) => Number(a.price) - Number(b.price),
      price_high: (a, b) => Number(b.price) - Number(a.price),
    };
    return [...list].sort(by[sort]);
  }, [products, selected, descendants, query, sort, availability]);

  const toggleFeatured = async (product: ProductType) => {
    const id = String(product.id);
    if (!token || featuredRequests.current.has(id)) return;
    featuredRequests.current.add(id);
    setFeaturedBusy((items) => [...items, id]);
    const next = !product.isFeatured;
    setProducts((prev) => prev.map((f) => (f.id === product.id ? { ...f, isFeatured: next } : f)));
    try {
      await axios.put(
        `${API_BASE_URL}/products/${String(product.id)}`,
        { isFeatured: next },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(next ? t("editor.featured_on") : t("editor.featured_off"));
    } catch {
      setProducts((prev) => prev.map((f) => (f.id === product.id ? { ...f, isFeatured: !next } : f)));
      toast.error(t("update_failed"));
    } finally {
      featuredRequests.current.delete(id);
      setFeaturedBusy((items) => items.filter((item) => item !== id));
    }
  };

  const selectedName = selected === ALL ? t("editor.all_products") : nameById.get(selected) ?? "";
  const loading = loadingProducts || loadingCats;

  const treeProps = {
    tree,
    loading: loadingCats,
    counts,
    totalCount: products.length,
    selectedId: selected,
    onChanged: () => {
      reloadCategories();
      reloadProducts();
    },
  };

  return (
    <div className="w-full">
      {/* Page header */}
      <div className="mb-[24px] flex flex-wrap items-end justify-between gap-[16px]">
        <div>
          <h1 className="store-heading text-[36px] md:text-[44px]">{t("sidebar.product_catalog")}</h1>
          <p className="mt-[6px] text-[13px] text-taupe">{t("editor.page_hint", { count: products.length })}</p>
        </div>
        <button
          type="button"
          onClick={() => setEditor({ open: true, product: null })}
          className="btn w-full sm:w-auto"
        >
          <Plus className="h-[16px] w-[16px]" />
          {t("product.add_modal.title")}
        </button>
      </div>

      <div className="xl:grid xl:grid-cols-[216px_minmax(0,1fr)] xl:gap-[24px]">
        {/* Desktop categories */}
        <aside className="hidden self-start border border-ink/10 bg-white p-[14px] xl:sticky xl:top-[28px] xl:block">
          <CategoryTree {...treeProps} onSelect={setSelected} />
        </aside>

        <section className="min-w-0">
          {/* Mobile: category picker + manage */}
          <div className="mb-[12px] flex gap-[8px] xl:hidden">
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="h-[44px] min-w-0 flex-1 cursor-pointer border border-ink/20 bg-white px-[12px] text-[14px] text-ink"
              aria-label={t("category.title")}
            >
              <option value={ALL}>
                {t("editor.all_products")} ({products.length})
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
          <div className="mb-[16px] grid gap-[8px] sm:grid-cols-2 2xl:grid-cols-[minmax(200px,1fr)_160px_180px]">
            <div className="relative sm:col-span-2 2xl:col-span-1">
              <Search className="pointer-events-none absolute left-[12px] top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-taupe" strokeWidth={1.5} />
              <input
                type="search"
                aria-label={t("editor.search_placeholder")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("editor.search_placeholder")}
                className="h-[44px] w-full border border-ink/20 bg-white pl-[38px] pr-[38px] text-[14px] text-ink outline-none placeholder:text-ink/60 focus:border-ink"
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
            <select value={availability} onChange={(event) => setAvailability(event.target.value)} aria-label={t("editor.availability")} className="h-[44px] min-w-0 border border-ink/20 bg-white px-3 text-sm">
              <option value="all">{t("editor.all_stock")}</option>
              <option value="available">{t("editor.in_stock")}</option>
              <option value="low">{t("overview.low_stock")}</option>
              <option value="soldout">{t("overview.soldout")}</option>
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="h-[44px] min-w-0 cursor-pointer border border-ink/20 bg-white px-[12px] text-[14px] text-ink"
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
            <span className="shrink-0 text-[13px] text-taupe">{t("product_count", { count: visible.length })}</span>
          </div>

          {(productError || categoryError) && (
            <div role="alert" className="mb-[12px] flex flex-wrap items-center justify-between gap-[12px] border border-terracotta/30 bg-white p-[14px]">
              <p className="text-[13px] text-terracotta">{t(productError ? "editor.load_failed" : "error_loading")}</p>
              <button type="button" className="btn-secondary !px-[14px]" onClick={() => { void reloadProducts(); void reloadCategories(); }} disabled={loading}>{t("retry")}</button>
            </div>
          )}

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
          ) : productError && products.length === 0 ? null : (
            <ProductList
              products={visible}
              showCategory={selected === ALL || (descendants.get(selected)?.length ?? 1) > 1}
              categoryName={(id) => nameById.get(id) ?? "—"}
              onEdit={(product) => setEditor({ open: true, product })}
              onToggleFeatured={toggleFeatured}
              busyFeatured={featuredBusy}
              emptyText={query ? t("editor.no_search_results") : t("no_category_products")}
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
        product={editor.product}
        categories={options}
        defaultCategoryId={selected === ALL ? null : selected}
        onSaved={() => {
          reloadProducts();
          reloadCategories();
        }}
      />
    </div>
  );
};
