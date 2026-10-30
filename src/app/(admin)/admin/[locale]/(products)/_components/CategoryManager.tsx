"use client";

import { useState, type FormEvent } from "react";
import axios from "axios";
import { toast } from "sonner";
import { FolderTree, Loader2, Plus, X } from "lucide-react";
import { api } from "@admin/lib/api";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@admin/components/ui/sheet";
import { ConfirmDialog } from "@admin/components/ui/confirm-dialog";
import { EmptyState, ErrorState, LoadingRows } from "@admin/components/ui/feedback";
import { CategoryNode } from "@admin/utils/categoryUtils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tree: CategoryNode[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  /** Products directly in each category. */
  counts: Record<string, number>;
  onChanged: () => void;
};

type Editing = { id: string; mode: "rename" | "child" } | null;

function useErrorText() {
  const { t } = useI18n();
  return (err: unknown, fallback: string) => {
    if (axios.isAxiosError(err) && !err.response) return t("common.errors.offline");
    if (axios.isAxiosError(err) && (err.response?.status === 401 || err.response?.status === 403)) return t("common.errors.signed_out");
    return fallback;
  };
}

/** Name input with its own Save/Cancel; used for adding and renaming. */
function NameForm({ initial = "", submitLabel, onSubmit, onCancel, busy, autoFocus }: { initial?: string; submitLabel: string; onSubmit: (name: string) => void; onCancel?: () => void; busy: boolean; autoFocus?: boolean }) {
  const { t } = useI18n();
  const [name, setName] = useState(initial);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim()) onSubmit(name.trim());
  };
  return (
    <form onSubmit={submit} className="flex flex-wrap gap-[8px]">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={100}
        autoFocus={autoFocus}
        disabled={busy}
        aria-label={t("categories.name")}
        placeholder={t("categories.placeholder")}
        className="field min-w-[160px] flex-1"
        onKeyDown={(e) => { if (e.key === "Escape" && onCancel) { e.preventDefault(); onCancel(); } }}
      />
      <button type="submit" disabled={busy || !name.trim() || name.trim() === initial} className="btn">
        {busy && <Loader2 aria-hidden className="h-[14px] w-[14px] animate-spin" />}
        {submitLabel}
      </button>
      {onCancel && (
        <button type="button" onClick={onCancel} disabled={busy} className="btn-ghost">
          {t("common.cancel")}
        </button>
      )}
    </form>
  );
}

export function CategoryManager({ open, onOpenChange, tree, loading, error, onRetry, counts, onChanged }: Props) {
  const { t } = useI18n();
  const errorText = useErrorText();
  const [editing, setEditing] = useState<Editing>(null);
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<CategoryNode | null>(null);
  const [addKey, setAddKey] = useState(0);

  const run = async (action: () => Promise<unknown>, success: string, failure: string) => {
    if (busy) return false;
    setBusy(true);
    try {
      await action();
      toast.success(success);
      onChanged();
      return true;
    } catch (err) {
      toast.error(errorText(err, failure));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const create = async (categoryName: string, parentId: string | null) => {
    const ok = await run(() => api.post("/category", { categoryName, parentId }), t("categories.toast.added", { name: categoryName }), t("categories.toast.add_failed"));
    if (ok) {
      setEditing(null);
      setAddKey((k) => k + 1);
    }
  };
  const rename = async (node: CategoryNode, categoryName: string) => {
    const ok = await run(() => api.put("/category", { id: node.id, categoryName }), t("categories.toast.renamed", { name: categoryName }), t("categories.toast.rename_failed"));
    if (ok) setEditing(null);
  };
  const remove = async () => {
    if (!toDelete) return;
    const node = toDelete;
    const ok = await run(() => api.delete("/category", { data: { id: node.id } }), t("categories.toast.deleted", { name: node.categoryName }), t("categories.toast.delete_failed"));
    if (ok) setToDelete(null);
  };

  const row = (node: CategoryNode, depth: number): React.ReactNode => {
    const count = node.productCount ?? counts[node.id] ?? 0;
    const isEditing = editing?.id === node.id;
    return (
      <li key={node.id}>
        <div className="border-b border-ink/10 py-[10px] pr-[4px]" style={{ paddingLeft: 12 + depth * 20 }}>
          {isEditing && editing.mode === "rename" ? (
            <NameForm initial={node.categoryName} submitLabel={t("common.save")} busy={busy} autoFocus onSubmit={(name) => void rename(node, name)} onCancel={() => setEditing(null)} />
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-x-[12px] gap-y-[4px]">
              <p className="min-w-0 text-[14px] text-ink">
                {depth > 0 && <span aria-hidden className="mr-[6px] text-taupe">└</span>}
                <span className="font-medium">{node.categoryName}</span>
                <span className="ml-[8px] text-[13px] text-taupe">{t("products.count", { count })}</span>
              </p>
              <div className="flex flex-wrap gap-[2px]">
                <button type="button" className="btn-ghost btn-sm" disabled={busy} onClick={() => setEditing({ id: node.id, mode: "child" })}>
                  <Plus aria-hidden className="h-[13px] w-[13px]" />
                  {t("categories.add_child")}
                </button>
                <button type="button" className="btn-ghost btn-sm" disabled={busy} onClick={() => setEditing({ id: node.id, mode: "rename" })}>
                  {t("categories.rename")}
                </button>
                <button type="button" className="btn-ghost btn-sm btn-danger-text" disabled={busy} onClick={() => setToDelete(node)}>
                  {t("common.delete")}
                </button>
              </div>
            </div>
          )}
          {isEditing && editing.mode === "child" && (
            <div className="mt-[10px]">
              <p className="mb-[6px] text-[13px] text-taupe">{t("categories.child_of", { name: node.categoryName })}</p>
              <NameForm submitLabel={t("common.add")} busy={busy} autoFocus onSubmit={(name) => void create(name, node.id)} onCancel={() => setEditing(null)} />
            </div>
          )}
        </div>
        {!!node.children?.length && <ul>{node.children.map((child) => row(child, depth + 1))}</ul>}
      </li>
    );
  };

  const deleteCount = toDelete ? toDelete.productCount ?? counts[toDelete.id] ?? 0 : 0;

  return (
    <Sheet open={open} onOpenChange={(next) => { if (!busy) onOpenChange(next); }}>
      <SheetContent side="right" hideClose className="flex w-full flex-col gap-0 bg-paper p-0 sm:max-w-[560px]">
        <div className="flex shrink-0 items-start justify-between gap-[12px] border-b border-ink/10 bg-white px-[20px] py-[16px]">
          <div>
            <SheetTitle className="text-[18px] font-semibold">{t("categories.title")}</SheetTitle>
            <SheetDescription className="mt-[2px] text-[13px] text-taupe">{t("categories.description")}</SheetDescription>
          </div>
          <button type="button" onClick={() => onOpenChange(false)} aria-label={t("common.close")} className="flex h-[44px] w-[44px] shrink-0 items-center justify-center text-taupe hover:bg-sand hover:text-ink">
            <X aria-hidden className="h-[18px] w-[18px]" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-[16px] sm:p-[20px]">
          <section className="admin-surface p-[16px]">
            <h3 className="admin-label">{t("categories.add_title")}</h3>
            <NameForm key={addKey} submitLabel={t("categories.add")} busy={busy} onSubmit={(name) => void create(name, null)} />
          </section>

          <section className="admin-surface mt-[16px]">
            {loading ? (
              <LoadingRows rows={4} rowClassName="h-[40px]" />
            ) : error ? (
              <ErrorState className="m-[12px]" message={t("categories.load_failed")} onRetry={onRetry} />
            ) : tree.length === 0 ? (
              <EmptyState icon={FolderTree} title={t("categories.empty_title")} description={t("categories.empty_body")} />
            ) : (
              <ul>{tree.map((node) => row(node, 0))}</ul>
            )}
          </section>
        </div>

        <ConfirmDialog
          open={toDelete !== null}
          onOpenChange={(next) => !next && setToDelete(null)}
          tone="danger"
          title={t("categories.delete_title", { name: toDelete?.categoryName ?? "" })}
          description={
            <>
              {deleteCount ? t("categories.delete_products", { count: deleteCount }) : t("categories.delete_empty")}{" "}
              {toDelete?.children?.length ? t("categories.delete_children", { count: toDelete.children.length }) : ""}
            </>
          }
          confirmLabel={t("categories.delete_confirm")}
          busy={busy}
          onConfirm={() => void remove()}
        />
      </SheetContent>
    </Sheet>
  );
}
