"use client";

import { use, useMemo, useState } from "react";
import { FoodCard } from "@/components/FoodCard";
import { CategorySidebar } from "@/components/category/CategorySidebar";
import { CategoryHeader } from "@/components/category/CategoryHeader";
import { useCategoryLogic } from "@/components/category/components/useCategoryFoods";
import { CategoryFilterSheet } from "@/components/category/components/CategoryFilterSheet";
import { CategorySortDrawer } from "@/components/category/components/CategorySortDrawer";
import { FoodCardSkeleton } from "@/components/skeletons/FoodCardSkeleton";

const PAGE_SIZE = 48;

type SortType = "newest" | "oldest" | "low" | "high";

export default function CategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const {
    filteredFoods,
    filters,
    categoryName,
    setSortType,
    toggleFilter,
    isLoading,
  } = useCategoryLogic(id);

  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(filteredFoods.length / PAGE_SIZE));

  const pagedFoods = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredFoods.slice(start, start + PAGE_SIZE);
  }, [filteredFoods, page]);

  return (
    <main className="min-h-screen w-full bg-background px-4 sm:px-6 md:px-10 pb-6">
      {/* MOBILE ACTIONS */}
      <div className="md:hidden sticky top-0 z-50 bg-background border-b">
        <div className="flex gap-3 px-4 py-3">
          <CategoryFilterSheet
            filters={filters}
            onFilterToggle={toggleFilter}
          />

          <CategorySortDrawer
            value="newest"
            onChange={(v) => {
              // "discounted" is a filter, not a sort
              if (v !== "discounted") {
                setSortType(v as SortType);
              }
              setPage(1);
            }}
          />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8 mt-6">
        {/* SIDEBAR */}
        <aside className="hidden md:block w-[260px] shrink-0">
          <CategorySidebar filters={filters} onFilterToggle={toggleFilter} />
        </aside>

        {/* CONTENT */}
        <section className="flex-1">
          <div className="hidden md:block">
            <CategoryHeader
              title={categoryName}
              count={filteredFoods.length}
              onSortChange={(v) => {
                setSortType(v as SortType);
                setPage(1);
              }}
            />
          </div>

          {/* GRID */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 mt-6">
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <FoodCardSkeleton key={i} />
                ))
              : pagedFoods.map((item) => (
                  <FoodCard key={item.id} food={item} />
                ))}
          </div>

          {/* PAGINATION */}
          {!isLoading && totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-12 text-sm">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-3 py-2 border rounded disabled:opacity-40"
              >
                «
              </button>

              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-2 border rounded disabled:opacity-40"
              >
                ‹
              </button>

              <span className="px-3 py-2">{page}</span>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-2 border rounded disabled:opacity-40"
              >
                ›
              </button>

              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="px-3 py-2 border rounded disabled:opacity-40"
              >
                »
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
