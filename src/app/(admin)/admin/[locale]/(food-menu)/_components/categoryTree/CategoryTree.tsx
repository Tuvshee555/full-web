"use client";

import { useState } from "react";
import { AddCategoryButton } from "../AddCategoryButton";
import { CategoryTreeNode } from "./CategoryTreeNode";
import { CategoryNode } from "./types";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";

type CategoryTreeProps = {
  tree: CategoryNode[];
  selectedId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
  onChanged: () => void;
};

export const CategoryTree: React.FC<CategoryTreeProps> = ({
  tree,
  selectedId,
  loading,
  onSelect,
  onChanged,
}) => {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-foreground">
          {t("categories")}
        </h2>

        <AddCategoryButton
          parentId={null}
          variant="primary"
          label={t("add_main")}
          onCreated={onChanged}
        />
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">{t("loading")}</p>
      ) : tree.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("no_categories")}</p>
      ) : (
        <div className="max-h-[70vh] overflow-y-auto pr-1">
          {tree.map((node) => (
            <CategoryTreeNode
              key={node.id}
              node={node}
              depth={0}
              selectedId={selectedId}
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
