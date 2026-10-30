"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import { FolderTree, PackagePlus, PackageSearch, Plus, Star, StarOff, Trash2 } from "lucide-react";

import { api } from "@admin/lib/api";
import { useAdminNav } from "@admin/lib/adminNav";
import { ProductType } from "@admin/type/type";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { CategoryNode } from "@admin/utils/categoryUtils";
import { StockState, needsRestock, stockSummary } from "@admin/utils/inventory";
import { PageHeader } from "@admin/components/ui/page";
import { BulkBar, Pagination, SearchInput, bulkButton } from "@admin/components/ui/controls";
import { EmptyState, ErrorState, LoadingRows } from "@admin/components/ui/feedback";
import { ConfirmDialog } from "@admin/components/ui/confirm-dialog";
import { ProductList } from "./_components/ProductList";
import { CategoryManager } from "./_components/CategoryManager";
import { CategoryOption, ProductEditor } from "./_components/editor/ProductEditor";

type Sort = "newest" | "name" | "price_low" | "price_high" | "stock";
type StockFilter = "all" | "restock" | "soldout" | "in_stock" | "untracked";
const STOCK_FILTERS: StockFilter[] = ["all", "restock", "soldout", "in_stock", "untracked"];
const ALL = "all";
/** Products whose category was deleted. */
const NONE = "none";
const PAGE_SIZE = 25;

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
const matchesStock = (state: StockState, filter: StockFilter) =>
  filter === "all" ||
  (filter === "restock" && (state === "low" || state === "partial" || state === "soldout")) ||
  (filter === "soldout" && state === "soldout") ||
  (filter === "in_stock" && state === "ok") ||
  (filter === "untracked" && state === "untracked");

export const ProductCatalog = () => {
  const { t } = useI18n();
  const { setParams } = useAdminNav();
  const searchParams = useSearchParams();
  const linkedProduct = searchParams?.get("product") ?? null;
  const stockParam = searchParams?.get("stock") as StockFilter | null;

  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [products, setProducts] = useState<ProductType[]>([]);
  const [categoryError, setCategoryError] = useState(false);
  const [productError, setProductError] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(ALL);
  const [stock, setStock] = useState<StockFilter>(stockParam && STOCK_FILTERS.includes(stockParam) ? stockParam : "all");
  const [sort, setSort] = useState<Sort>("newest");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editor, setEditor] = useState<{ open: boolean; product: ProductType | null }>({ open: false, product: null });
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [featuredBusy, setFeaturedBusy] = useState<string[]>([]);
  const [bulk, setBulk] = useState<"move" | "delete" | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [moveTo, setMoveTo] = useState("");
  const featuredRequests = useRef(new Set<string>());

  const reloadCategories = useCallback(async () => {
    try {
      setLoadingCats(true);
      const res = await api.get("/category/tree");
      setTree(Array.isArray(res.data) ? res.data : []);
      setCategoryError(false);
    } catch {
      setCategoryError(true);
    } finally {
      setLoadingCats(false);
    }
  }, []);

  const reloadProducts = useCallback(async () => {
    try {
      setLoadingProducts(true);
      const res = await api.get("/products/admin/inventory");
      setProducts(Array.isArray(res.data) ? res.data : []);
      setProductError(false);
    } catch {
      setProductError(true);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    void reloadCategories();
    void reloadProducts();
  }, [reloadCategories, reloadProducts]);

  const reloadAll = () => {
    void reloadProducts();
    void reloadCategories();
  };

  const options = useMemo(() => flattenWithDepth(tree), [tree]);
  const descendants = useMemo(() => descendantsMap(tree), [tree]);
  const nameById = useMemo(() => new Map(options.map((o) => [o.id, o.name])), [options]);
  const known = useCallback((id?: string | null) => Boolean(id && nameById.has(id)), [nameById]);
  const uncategorized = useMemo(() => (loadingCats ? 0 : products.filter((p) => !known(p.categoryId)).length), [products, known, loadingCats]);

  // If the selected category was deleted, fall back to "all"
  useEffect(() => {
    if (category !== ALL && category !== NONE && !loadingCats && !nameById.has(category)) setCategory(ALL);
  }, [category, loadingCats, nameById]);

  // A link from elsewhere (overview stock alerts) opens that product's editor once the list is in
  useEffect(() => {
    if (!linkedProduct || loadingProducts) return;
    const product = products.find((p) => String(p.id) === linkedProduct);
    if (product) setEditor({ open: true, product });
    else if (!productError) toast.error(t("products.errors.not_found"));
    setParams({ product: null });
  }, [linkedProduct, loadingProducts, products, productError, setParams, t]);

  const counts = useMemo(() => {
    const direct = new Map<string, number>();
    products.forEach((f) => direct.set(f.categoryId, (direct.get(f.categoryId) ?? 0) + 1));
    const out: Record<string, number> = {};
    descendants.forEach((ids, id) => {
      out[id] = ids.reduce((s, x) => s + (direct.get(x) ?? 0), 0);
    });
    return { all: out, direct: Object.fromEntries(direct) as Record<string, number> };
  }, [products, descendants]);

  const withStock = useMemo(() => products.map((p) => ({ product: p, stock: stockSummary(p.sizes) })), [products]);
  const restockCount = withStock.filter((x) => needsRestock(x.stock)).length;

  const visible = useMemo(() => {
    const inCat = category === ALL || category === NONE ? null : new Set(descendants.get(category) ?? [category]);
    const q = query.trim().toLocaleLowerCase();
    const list = withStock.filter(({ product: f, stock: s }) =>
      (category === ALL || (category === NONE ? !known(f.categoryId) : inCat!.has(f.categoryId))) &&
      (!q || `${f.productName} ${f.ingredients} ${nameById.get(f.categoryId) ?? ""}`.toLocaleLowerCase().includes(q)) &&
      matchesStock(s.state, stock)
    );
    const stockRank = (x: (typeof list)[number]) => (x.stock.state === "untracked" ? Number.MAX_SAFE_INTEGER : x.stock.total);
    const by: Record<Sort, (a: (typeof list)[number], b: (typeof list)[number]) => number> = {
      newest: (a, b) => time(b.product) - time(a.product),
      name: (a, b) => a.product.productName.localeCompare(b.product.productName),
      price_low: (a, b) => Number(a.product.price) - Number(b.product.price),
      price_high: (a, b) => Number(b.product.price) - Number(a.product.price),
      stock: (a, b) => stockRank(a) - stockRank(b),
    };
    return [...list].sort(by[sort]).map((x) => x.product);
  }, [withStock, category, descendants, query, sort, stock, known, nameById]);

  // Filters change the list: start again at page 1 with nothing selected
  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [category, query, stock, sort]);
  const pageItems = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const filtered = category !== ALL || stock !== "all" || query.trim() !== "";

  const changeStock = (value: StockFilter) => {
    setStock(value);
    setParams({ stock: value === "all" ? null : value });
  };
  const clearFilters = () => {
    setQuery("");
    setCategory(ALL);
    changeStock("all");
  };

  const toggleFeatured = async (product: ProductType) => {
    const id = String(product.id);
    if (featuredRequests.current.has(id)) return;
    featuredRequests.current.add(id);
    setFeaturedBusy((items) => [...items, id]);
    const next = !product.isFeatured;
    setProducts((prev) => prev.map((f) => (f.id === product.id ? { ...f, isFeatured: next } : f)));
    try {
      await api.put(`/products/${id}`, { isFeatured: next });
      toast.success(t(next ? "products.toast.featured" : "products.toast.unfeatured", { name: product.productName }));
    } catch {
      setProducts((prev) => prev.map((f) => (f.id === product.id ? { ...f, isFeatured: !next } : f)));
      toast.error(t("products.errors.update_failed"));
    } finally {
      featuredRequests.current.delete(id);
      setFeaturedBusy((items) => items.filter((item) => item !== id));
    }
  };

  // ----- Bulk actions: one request per product, then one summary message -----
  const selectedProducts = products.filter((p) => selected.has(String(p.id)));
  const runBulk = async (action: (p: ProductType) => Promise<unknown>, done: string, failedKey: string) => {
    if (bulkBusy || !selectedProducts.length) return;
    setBulkBusy(true);
    let ok = 0;
    const failed: string[] = [];
    let ordered = 0;
    for (const product of selectedProducts) {
      try {
        await action(product);
        ok += 1;
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 409) ordered += 1;
        failed.push(product.productName);
      }
    }
    if (ok) toast.success(t(done, { count: ok }));
    if (failed.length) toast.error(t(ordered ? "products.bulk.failed_ordered" : failedKey, { count: failed.length, names: failed.join(", ") }));
    setBulkBusy(false);
    setBulk(null);
    setSelected(new Set());
    reloadAll();
  };
  const setFeaturedMany = (on: boolean) =>
    void runBulk((p) => api.put(`/products/${String(p.id)}`, { isFeatured: on }), on ? "products.bulk.featured_done" : "products.bulk.unfeatured_done", "products.bulk.failed");
  const moveMany = () =>
    moveTo && void runBulk((p) => api.put(`/products/${String(p.id)}`, { categoryId: moveTo }), "products.bulk.moved_done", "products.bulk.failed");
  const deleteMany = () => void runBulk((p) => api.delete(`/products/${String(p.id)}`), "products.bulk.deleted_done", "products.bulk.failed");

  const loading = loadingProducts || loadingCats;
  const categoryLabel = (id?: string | null) => (id && nameById.get(id)) || t("products.no_category");

  return (
    <div className="w-full">
      <PageHeader
        title={t("products.title")}
        description={loading ? t("common.loading") : t("products.description", { count: products.length, categories: options.length })}
        actions={
          <>
            <button type="button" onClick={() => setCategoriesOpen(true)} className="btn-secondary">
              <FolderTree aria-hidden className="h-[16px] w-[16px]" strokeWidth={1.6} />
              {t("products.manage_categories")}
            </button>
            <button type="button" onClick={() => setEditor({ open: true, product: null })} className="btn">
              <Plus aria-hidden className="h-[16px] w-[16px]" />
              {t("products.add")}
            </button>
          </>
        }
      />

      {/* Filters */}
      <div className="mb-[12px] grid gap-[8px] sm:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_repeat(3,minmax(150px,1fr))]">
        <SearchInput value={query} onChange={setQuery} placeholder={t("products.search")} className="sm:col-span-2 xl:col-span-1" />
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label={t("products.filter.category")} className="field">
          <option value={ALL}>{t("products.filter.all_categories", { count: products.length })}</option>
          {uncategorized > 0 && <option value={NONE}>{t("products.filter.no_category", { count: uncategorized })}</option>}
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {"   ".repeat(o.depth)}{o.name} ({counts.all[o.id] ?? 0})
            </option>
          ))}
        </select>
        <select value={stock} onChange={(e) => changeStock(e.target.value as StockFilter)} aria-label={t("products.filter.stock")} className="field">
          {STOCK_FILTERS.map((value) => (
            <option key={value} value={value}>
              {t(`products.filter.stock_${value}`)}{value === "restock" ? ` (${restockCount})` : ""}
            </option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label={t("products.filter.sort")} className="field">
          {(["newest", "name", "price_low", "price_high", "stock"] as Sort[]).map((value) => (
            <option key={value} value={value}>{t(`products.sort.${value}`)}</option>
          ))}
        </select>
      </div>

      {!loading && (
        <div className="mb-[10px] flex flex-wrap items-center justify-between gap-[8px]">
          <p className="text-[13px] text-taupe" aria-live="polite">
            {filtered ? t("products.showing_filtered", { count: visible.length, total: products.length }) : t("products.count", { count: products.length })}
          </p>
          {filtered && (
            <button type="button" onClick={clearFilters} className="btn-ghost btn-sm">
              {t("products.clear_filters")}
            </button>
          )}
        </div>
      )}

      {(productError || categoryError) && (
        <ErrorState className="mb-[12px]" message={t(productError ? "products.errors.load_failed" : "categories.load_failed")} onRetry={reloadAll} retrying={loading} />
      )}

      {loading ? (
        <div className="admin-surface"><LoadingRows rows={6} rowClassName="h-[64px]" /></div>
      ) : productError && products.length === 0 ? null : visible.length === 0 ? (
        <div className="admin-surface">
          {products.length === 0 ? (
            <EmptyState
              icon={PackagePlus}
              title={t("products.empty.title")}
              description={t("products.empty.body")}
              action={<button type="button" className="btn" onClick={() => setEditor({ open: true, product: null })}><Plus aria-hidden className="h-[16px] w-[16px]" />{t("products.add")}</button>}
            />
          ) : (
            <EmptyState
              icon={PackageSearch}
              title={t("products.no_match.title")}
              description={t("products.no_match.body")}
              action={<button type="button" className="btn-secondary" onClick={clearFilters}>{t("products.clear_filters")}</button>}
            />
          )}
        </div>
      ) : (
        <div className="admin-surface">
          <ProductList
            products={pageItems}
            categoryName={categoryLabel}
            onEdit={(product) => setEditor({ open: true, product })}
            onToggleFeatured={toggleFeatured}
            busyFeatured={featuredBusy}
            selected={selected}
            onSelect={(id, on) => setSelected((prev) => { const next = new Set(prev); if (on) next.add(id); else next.delete(id); return next; })}
            onSelectAll={(on) => setSelected(on ? new Set(pageItems.map((p) => String(p.id))) : new Set())}
          />
          <Pagination page={page} pageSize={PAGE_SIZE} total={visible.length} onPage={(p) => { setPage(p); window.scrollTo({ top: 0 }); }} />
        </div>
      )}

      <BulkBar count={selectedProducts.length} onClear={() => setSelected(new Set())}>
        <button type="button" className={bulkButton} disabled={bulkBusy} onClick={() => setFeaturedMany(true)}>
          <Star aria-hidden className="h-[14px] w-[14px]" strokeWidth={1.6} />
          {t("products.bulk.feature")}
        </button>
        <button type="button" className={bulkButton} disabled={bulkBusy} onClick={() => setFeaturedMany(false)}>
          <StarOff aria-hidden className="h-[14px] w-[14px]" strokeWidth={1.6} />
          {t("products.bulk.unfeature")}
        </button>
        <button type="button" className={bulkButton} disabled={bulkBusy || !options.length} onClick={() => { setMoveTo(""); setBulk("move"); }}>
          <FolderTree aria-hidden className="h-[14px] w-[14px]" strokeWidth={1.6} />
          {t("products.bulk.move")}
        </button>
        <button type="button" className={`${bulkButton} !text-terracotta`} disabled={bulkBusy} onClick={() => setBulk("delete")}>
          <Trash2 aria-hidden className="h-[14px] w-[14px]" strokeWidth={1.6} />
          {t("products.bulk.delete")}
        </button>
      </BulkBar>

      <ConfirmDialog
        open={bulk === "move"}
        onOpenChange={(open) => !open && setBulk(null)}
        title={t("products.bulk.move_title", { count: selectedProducts.length })}
        description={t("products.bulk.move_body")}
        confirmLabel={t("products.bulk.move_confirm")}
        busy={bulkBusy}
        confirmDisabled={!moveTo}
        onConfirm={moveMany}
      >
        <div>
          <label htmlFor="bulk-move" className="admin-label">{t("editor.category")}</label>
          <select id="bulk-move" value={moveTo} onChange={(e) => setMoveTo(e.target.value)} className="field">
            <option value="" disabled>{t("editor.category_placeholder")}</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>{"   ".repeat(o.depth)}{o.name}</option>
            ))}
          </select>
          {!moveTo && <p className="admin-hint">{t("products.bulk.move_pick")}</p>}
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={bulk === "delete"}
        onOpenChange={(open) => !open && setBulk(null)}
        tone="danger"
        title={t("products.bulk.delete_title", { count: selectedProducts.length })}
        description={t("products.bulk.delete_body")}
        confirmLabel={t("products.bulk.delete_confirm", { count: selectedProducts.length })}
        busy={bulkBusy}
        onConfirm={deleteMany}
      >
        <ul className="max-h-[160px] list-disc overflow-y-auto pl-[20px] text-[14px] text-ink">
          {selectedProducts.map((p) => <li key={String(p.id)}>{p.productName}</li>)}
        </ul>
      </ConfirmDialog>

      <CategoryManager
        open={categoriesOpen}
        onOpenChange={setCategoriesOpen}
        tree={tree}
        loading={loadingCats}
        error={categoryError}
        onRetry={() => void reloadCategories()}
        counts={counts.direct}
        onChanged={reloadAll}
      />

      <ProductEditor
        open={editor.open}
        onOpenChange={(open) => setEditor((e) => ({ ...e, open }))}
        product={editor.product}
        categories={options}
        defaultCategoryId={category === ALL || category === NONE ? null : category}
        onSaved={reloadAll}
      />
    </div>
  );
};
