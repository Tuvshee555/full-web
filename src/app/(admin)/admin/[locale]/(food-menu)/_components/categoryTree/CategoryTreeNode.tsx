"use client";

import { API_BASE_URL } from "@admin/lib/api";
import axios from "axios";
import { ChevronRight, ChevronDown, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CategoryNode } from "./types";
import { AddCategoryButton } from "../AddCategoryButton";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { useAuth } from "@admin/provider/AuthProvider";
import { RenameDialog } from "./components/RenameDialog";
import { DeleteDialog } from "./components/DeleteDialog";

type Props = {
  node: CategoryNode;
  depth: number;
  selectedId: string;
  counts: Record<string, number>;
  expanded: Record<string, boolean>;
  toggle: (id: string) => void;
  onSelect: (id: string) => void;
  onChanged: () => void;
};

export const CategoryTreeNode: React.FC<Props> = ({
  node,
  depth,
  selectedId,
  counts,
  expanded,
  toggle,
  onSelect,
  onChanged,
}) => {
  const { t } = useI18n();
  const { token } = useAuth();

  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const hasChildren = node.children && node.children.length > 0;
  const isOpen = expanded[node.id] ?? true;
  const isSelected = selectedId === node.id;

  /* ------------------ RENAME ------------------ */
  const handleRenameConfirm = async (newName: string) => {
    if (!newName.trim() || newName === node.categoryName) {
      setRenameOpen(false);
      return;
    }

    if (!token) {
      toast.error(t("unauthorized"));
      return;
    }

    try {
      await axios.put(
        `${API_BASE_URL}/category`,
        { id: node.id, categoryName: newName.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setRenameOpen(false);
      onChanged();
      toast.success(t("updated"));
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || t("update_failed")
        : t("update_failed");
      toast.error(message);
    }
  };

  /* ------------------ DELETE ------------------ */
  const handleDeleteConfirm = async () => {
    setDeleteOpen(false);

    if (!token) {
      toast.error(t("unauthorized"));
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/category`, {
        data: { id: node.id },
        headers: { Authorization: `Bearer ${token}` },
      });

      onChanged();
      toast.success(t("deleted"));
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || t("update_failed")
        : t("update_failed");
      toast.error(message);
    }
  };

  const count = counts[node.id] ?? 0;

  return (
    <div className="mb-[2px]">
      <div
        className={`group flex min-h-[40px] cursor-pointer items-center gap-[4px] pr-[6px] text-[14px] transition-colors ${
          isSelected ? "bg-sand text-ink" : "text-ink hover:bg-sand/60"
        }`}
        style={{ paddingLeft: 4 + depth * 14 }}
        onClick={() => onSelect(node.id)}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggle(node.id);
            }}
            aria-label={isOpen ? "Collapse" : "Expand"}
            className="flex h-[28px] w-[24px] shrink-0 items-center justify-center text-taupe hover:text-ink"
          >
            {isOpen ? <ChevronDown className="h-[14px] w-[14px]" /> : <ChevronRight className="h-[14px] w-[14px]" />}
          </button>
        ) : (
          <span className="w-[24px] shrink-0" />
        )}

        <span className={`min-w-0 flex-1 py-[8px] leading-snug ${isSelected ? "font-medium" : ""}`}>
          {node.categoryName}
        </span>

        {/* Count; swapped for actions on hover, always-on actions when selected or on touch */}
        <span
          className={`shrink-0 text-[12px] tabular-nums text-taupe group-hover:hidden ${
            isSelected ? "hidden" : "[@media(hover:none)]:hidden"
          }`}
        >
          {count}
        </span>
        <div
          className={`shrink-0 items-center group-hover:flex ${isSelected ? "flex" : "hidden [@media(hover:none)]:flex"}`}
          onClick={(e) => e.stopPropagation()}
        >
          <AddCategoryButton parentId={node.id} variant="icon" tooltip={t("add_sub")} onCreated={onChanged} />
          <button
            type="button"
            onClick={() => setRenameOpen(true)}
            className="flex h-[30px] w-[30px] items-center justify-center text-ink/60 hover:bg-paper hover:text-ink"
            title={t("editor.rename_category")}
            aria-label={t("editor.rename_category")}
          >
            <Pencil className="h-[13px] w-[13px]" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="flex h-[30px] w-[30px] items-center justify-center text-ink/60 hover:bg-paper hover:text-terracotta"
            title={t("editor.delete_category")}
            aria-label={t("editor.delete_category")}
          >
            <Trash2 className="h-[13px] w-[13px]" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* RENAME DIALOG */}
      <RenameDialog
        open={renameOpen}
        initialValue={node.categoryName}
        title={t("rename_prompt")}
        placeholder={t("category.name")}
        onCancel={() => setRenameOpen(false)}
        onConfirm={handleRenameConfirm}
      />

      {/* DELETE DIALOG */}
      <DeleteDialog
        open={deleteOpen}
        title={t("delete_confirm", { name: node.categoryName })}
        description={t("delete_category_description") ?? ""}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
      />

      {/* CHILDREN */}
      {hasChildren && isOpen && (
        <div className="mt-1">
          {node.children!.map((child) => (
            <CategoryTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
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
