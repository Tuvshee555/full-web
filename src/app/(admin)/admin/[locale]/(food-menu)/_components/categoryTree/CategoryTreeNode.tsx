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
  selectedId: string | null;
  expanded: Record<string, boolean>;
  toggle: (id: string) => void;
  onSelect: (id: string) => void;
  onChanged: () => void;
};

export const CategoryTreeNode: React.FC<Props> = ({
  node,
  depth,
  selectedId,
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

  return (
    <div className="mb-1">
      <div
        className={`
          group flex items-center justify-between
          rounded-md px-2 py-1.5 text-sm
          cursor-pointer transition-colors
          ${
            isSelected
              ? "bg-primary/10 text-primary font-medium"
              : "text-foreground hover:bg-muted/60"
          }
        `}
        style={{ paddingLeft: 8 + depth * 12 }}
      >
        {/* LEFT */}
        <div
          className="flex items-center gap-1 flex-1 min-w-0"
          onClick={() => onSelect(node.id)}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggle(node.id);
              }}
              className="h-[24px] w-[24px] flex items-center justify-center rounded hover:bg-muted"
            >
              {isOpen ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
          ) : (
            <span className="w-6" />
          )}

          <span className="truncate text-sm font-medium">{node.categoryName}</span>
        </div>

        {/* RIGHT ACTIONS */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <AddCategoryButton
            parentId={node.id}
            variant="icon"
            tooltip={t("add_sub")}
            onCreated={onChanged}
          />

          {/* ✏️ RENAME */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setRenameOpen(true);
            }}
            className="h-[28px] w-[28px] flex items-center justify-center rounded hover:bg-muted"
            title={t("rename_prompt")}
          >
            <Pencil className="w-3 h-3" />
          </button>

          {/* 🗑 DELETE */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteOpen(true);
            }}
            className="h-[28px] w-[28px] flex items-center justify-center rounded hover:bg-muted text-destructive"
          >
            <Trash2 className="w-3 h-3" />
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
