"use client";

import { useState } from "react";
import { AddCategoryButton } from "../AddCategoryButton";
import { CategoryTreeNode } from "./CategoryTreeNode";
import { CategoryNode } from "./types";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";

export const ALL = "all";

type CategoryTreeProps = {
  tree: CategoryNode[];
  /** Category id, or ALL for every product. */
  selectedId: string;
  loading: boolean;
  counts: Record<string, number>;
  totalCount: number;
  onSelect: (id: string) => void;
  onChanged: () => void;
};

export const CategoryTree: React.FC<CategoryTreeProps> = ({
  tree,
  selectedId,
  loading,
  counts,
  totalCount,
  onSelect,
  onChanged,
}) => {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));
  };

  const allActive = selectedId === ALL;

  return (
    <div className="flex flex-col">
      <div className="mb-[10px] flex items-center justify-between gap-[8px] px-[4px]">
        <h2 className="eyebrow">{t("categories")}</h2>
        <AddCategoryButton parentId={null} variant="link" label={t("editor.new_category")} onCreated={onChanged} />
      </div>

      <button
        type="button"
        onClick={() => onSelect(ALL)}
        className={`mb-[2px] flex h-[40px] items-center justify-between px-[12px] text-left text-[14px] transition-colors ${
          allActive ? "bg-ink text-paper" : "text-ink hover:bg-sand"
        }`}
      >
        <span className="font-medium">{t("editor.all_products")}</span>
        <span className={`text-[12px] tabular-nums ${allActive ? "text-paper/70" : "text-taupe"}`}>{totalCount}</span>
      </button>

      {loading ? (
        <p className="px-[12px] py-[8px] text-[12px] text-taupe">{t("loading")}</p>
      ) : tree.length === 0 ? (
        <p className="px-[12px] py-[8px] text-[12px] text-taupe">{t("no_categories")}</p>
      ) : (
        <div className="max-h-[calc(100vh-260px)] overflow-y-auto">
          {tree.map((node) => (
            <CategoryTreeNode
              key={node.id}
              node={node}
              depth={0}
              selectedId={selectedId}
              counts={counts}
              expanded={expanded}
              toggle={toggle}
              onSelect={onSelect}
              onChanged={onChanged}
            />
          ))}
        </div>
      )}
    </div>
  );
};
