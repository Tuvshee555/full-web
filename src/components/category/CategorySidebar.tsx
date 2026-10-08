"use client";

import { API_BASE_URL } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import { buildTree, Category } from "./components/categoryTree";
import { CategorySidebarBody } from "./components/CategorySidebarBody";

export const CategorySidebar = ({
  filters,
  onFilterToggle,
}: {
  filters: { discount: boolean; featured: boolean; bestseller: boolean };
  onFilterToggle: (key: keyof typeof filters) => void;
}) => {
  const { t, locale } = useI18n();
  const pathname = usePathname();

  const [rawCategories, setRawCategories] = useState<Category[]>([]);
  const [allCount, setAllCount] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    fetch(`${API_BASE_URL}/category`)
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setRawCategories(d));

    fetch(`${API_BASE_URL}/food`)
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setAllCount(d.length));
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
    <>
      <div className="md:hidden">
        <button onClick={() => setMobileOpen(true)} className="w-full p-3">
          {t("categories")}
        </button>
      </div>

      <aside className="hidden md:block w-[250px]">
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
          }}
        />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-[2000] bg-black/50">
          <div className="absolute right-0 w-full max-w-[420px] h-full bg-card p-5">
            <button onClick={() => setMobileOpen(false)}>
              <X />
            </button>

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
                onNavigate: () => setMobileOpen(false),
              }}
            />
          </div>
        </div>
      )}
    </>
  );
};
