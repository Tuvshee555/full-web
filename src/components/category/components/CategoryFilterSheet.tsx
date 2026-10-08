"use client";

import { API_BASE_URL } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { buildTree, Category } from "./categoryTree";
import { CategorySidebarBody } from "./CategorySidebarBody";

type Filters = {
  discount: boolean;
  featured: boolean;
  bestseller: boolean;
};

export function CategoryFilterSheet({
  filters,
  onFilterToggle,
}: {
  filters: Filters;
  onFilterToggle: (key: keyof Filters) => void;
}) {
  const { t, locale } = useI18n();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [rawCategories, setRawCategories] = useState<Category[]>([]);
  const [allCount, setAllCount] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    fetch(`${API_BASE_URL}/category`)
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setRawCategories(d))
      .catch(() => {});

    fetch(`${API_BASE_URL}/food`)
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setAllCount(d.length))
      .catch(() => {});
  }, []);

  const { roots } = useMemo(() => buildTree(rawCategories), [rawCategories]);

  const filteredFlat = useMemo(() => {
    const q = search.toLowerCase();
    return q
      ? rawCategories.filter((c) => c.categoryName.toLowerCase().includes(q))
      : rawCategories;
  }, [search, rawCategories]);

  const isAllActive = pathname?.includes(`/${locale}/category/all`) ?? false;
  const toggle = (id: string) => setExpanded((s) => ({ ...s, [id]: !s[id] }));

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="flex-1 h-[44px] rounded-md border border-border bg-card text-sm font-medium">
          {t("filter")}
        </button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="
          w-[85vw]
          max-w-[420px]
          h-screen
          p-5
          md:hidden
          z-[100]
        "
      >
        <div className="flex items-center justify-between mb-3">
          <SheetTitle className="text-sm font-semibold">
            {t("filter_title")}
          </SheetTitle>

          <button onClick={() => setOpen(false)} aria-label={t("close")}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <CategorySidebarBody
          {...{
            locale,
            t,
            pathname,
            mounted,
            search,
            setSearch,
            roots,
            filteredFlat,
            showFlatList: search.length > 0,
            expanded,
            toggle,
            allCount,
            isAllActive,
            filters,
            onFilterToggle,
            onNavigate: () => setOpen(false),
          }}
        />

        <div className="absolute bottom-0 left-0 w-full border-t border-border bg-card p-4">
          <div className="flex gap-3">
            <button
              onClick={() => {
                if (filters.discount) onFilterToggle("discount");
                if (filters.featured) onFilterToggle("featured");
                if (filters.bestseller) onFilterToggle("bestseller");
              }}
              className="flex-1 h-[44px] rounded-md border border-border text-sm"
            >
              {t("reset")}
            </button>

            <button
              onClick={() => setOpen(false)}
              className="flex-1 h-[44px] rounded-md bg-primary text-primary-foreground text-sm font-medium"
            >
              {t("close")}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
