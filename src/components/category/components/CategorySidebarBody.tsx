"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Category, CategoryNode } from "./categoryTree";

type Props = {
  locale: string;
  t: (k: string) => string;
  pathname: string | null;
  mounted: boolean;

  search: string;
  setSearch: (v: string) => void;

  roots: CategoryNode[];
  filteredFlat: Category[];
  showFlatList: boolean;

  expanded: Record<string, boolean>;
  toggle: (id: string) => void;

  allCount: number | null;
  isAllActive: boolean;

  filters: {
    discount: boolean;
    featured: boolean;
    bestseller: boolean;
  };
  onFilterToggle: (key: keyof Props["filters"]) => void;

  onNavigate?: () => void;
};

export const CategorySidebarBody = ({
  locale,
  t,
  pathname,
  mounted,
  search,
  setSearch,
  roots,
  filteredFlat,
  showFlatList,
  expanded,
  toggle,
  allCount,
  isAllActive,
  filters,
  onFilterToggle,
  onNavigate,
}: Props) => {
  const router = useRouter();

  const extractIdFromPath = useCallback(() => {
    if (!mounted || !pathname) return null;
    const parts = pathname.split("/");
    const idx = parts.findIndex((p) => p === "category");
    return idx === -1 ? null : parts[idx + 1] ?? null;
  }, [pathname, mounted]);

  const handleCategoryClick = (node: CategoryNode) => {
    const hasChildren = node.children.length > 0;
    const isOpen = !!expanded[node.id];

    if (hasChildren && !isOpen) {
      toggle(node.id);
      return;
    }

    router.push(`/${locale}/category/${node.id}`);
    onNavigate?.();
  };

  const renderNode = (node: CategoryNode, depth = 0) => {
    const isOpen = !!expanded[node.id];
    const activeId = extractIdFromPath();
    const isActive = activeId === node.id;

    return (
      <li key={node.id}>
        {/* ROW — match CategoryTree sizing */}
        <div
          className={`flex items-center justify-between select-none ${
            depth > 0 ? "pl-5" : ""
          }`}
        >
          {/* TEXT */}
          <button
            onClick={() => handleCategoryClick(node)}
            className={`flex-1 text-left py-4 px-1 text-base md:text-lg truncate ${
              isActive ? "text-primary font-medium" : "text-foreground/90"
            }`}
          >
            {node.categoryName}
          </button>

          {/* CHEVRON — CSS rotation (avoids initial Framer mismatch) */}
          {node.children.length > 0 && (
            <div
              onClick={() => toggle(node.id)}
              role="button"
              aria-label={isOpen ? "collapse" : "expand"}
              className={`w-10 h-10 flex items-center justify-center text-muted-foreground cursor-pointer transition-transform duration-150 ${
                isOpen ? "rotate-90" : "rotate-0"
              }`}
            >
              <ChevronRight size={20} />
            </div>
          )}
        </div>

        {/* CHILDREN — Framer handles expand/collapse height & opacity */}
        <AnimatePresence initial={false}>
          {isOpen && node.children.length > 0 && (
            <motion.ul
              key={`${node.id}-children`}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className="ml-4">
                {node.children.map((c) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.18 }}
                    className="pl-2"
                  >
                    {renderNode(c, depth + 1)}
                  </motion.div>
                ))}
              </div>
            </motion.ul>
          )}
        </AnimatePresence>

        {/* separator to match CategoryTree */}
        <div className="h-px bg-border/60" />
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* SEARCH */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("search_by_name")}
          className="w-full pl-9 py-2.5 text-sm border border-border rounded-lg bg-background"
        />
      </div>

      {/* CATEGORIES */}
      <ul className="flex flex-col gap-1">
        <button
          onClick={() => {
            router.push(`/${locale}/category/all`);
            onNavigate?.();
          }}
          className={`px-2 py-2 rounded-lg flex justify-between text-sm ${
            isAllActive ? "bg-card/70 text-primary" : "hover:bg-muted/40"
          }`}
        >
          <span className="font-medium">{t("all_products")}</span>
          <span className="text-xs text-muted-foreground">
            {mounted ? allCount ?? "-" : "-"}
          </span>
        </button>

        {showFlatList
          ? filteredFlat.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  router.push(`/${locale}/category/${c.id}`);
                  onNavigate?.();
                }}
                className="px-3 py-2 rounded-lg text-left text-sm hover:bg-muted/40"
              >
                {c.categoryName}
              </button>
            ))
          : roots.map((r) => renderNode(r))}
      </ul>

      {/* FILTERS */}
      <div className="flex flex-col gap-3 text-sm">
        {(["discount", "featured", "bestseller"] as const).map((k) => (
          <label key={k} className="flex gap-2 items-center">
            <input
              type="checkbox"
              checked={filters[k]}
              onChange={() => onFilterToggle(k)}
            />
            <span>{t(k)}</span>
          </label>
        ))}
      </div>
    </div>
  );
};
