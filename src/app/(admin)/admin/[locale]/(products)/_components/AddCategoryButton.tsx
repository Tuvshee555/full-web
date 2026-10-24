"use client";

import { API_BASE_URL } from "@admin/lib/api";
import { useRef, useState } from "react";
import axios from "axios";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@admin/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@admin/components/ui/dialog";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { useAuth } from "@admin/provider/AuthProvider";

type Props = {
  parentId?: string | null;
  onCreated: () => void;
  variant?: "primary" | "icon" | "link";
  label?: string;
  tooltip?: string;
};

export const AddCategoryButton: React.FC<Props> = ({
  parentId = null,
  onCreated,
  variant = "primary",
  label,
  tooltip,
}) => {
  const { t } = useI18n();
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [loading, setLoading] = useState(false);
  const pending = useRef(false);

  const handleSubmit = async () => {
    if (!categoryName.trim() || pending.current) return;
    if (!token) {
      toast.error(t("unauthorized"));
      return;
    }

    try {
      pending.current = true;
      setLoading(true);
      await axios.post(
        `${API_BASE_URL}/category`,
        { categoryName: categoryName.trim(), parentId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCategoryName("");
      setOpen(false);
      onCreated();
      toast.success(t("category.add"));
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || t("unauthorized")
        : t("unauthorized");
      toast.error(message);
    } finally {
      pending.current = false;
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!loading) setOpen(next); }}>
      <DialogTrigger asChild>
        {variant === "primary" ? (
          <Button variant="outline" size="sm" className="gap-1.5 h-8" title={tooltip}>
            <Plus className="w-4 h-4" />
            <span>{label ?? t("category.add")}</span>
          </Button>
        ) : variant === "link" ? (
          <button
            type="button"
            className="inline-flex h-[30px] items-center gap-[4px] px-[6px] text-[12px] font-medium text-ink hover:bg-sand"
            title={tooltip}
          >
            <Plus className="h-[13px] w-[13px]" />
            {label ?? t("category.add")}
          </button>
        ) : (
          <button
            type="button"
            className="flex h-[30px] w-[30px] items-center justify-center text-ink/60 hover:bg-paper hover:text-ink"
            title={tooltip}
            aria-label={tooltip}
          >
            <Plus className="h-[14px] w-[14px]" />
          </button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-[calc(100vw-32px)] bg-card text-foreground sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{t("category.add")}</DialogTitle>
          <DialogDescription>{t("category.add_description")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          <div className="flex flex-col gap-1">
            <label htmlFor={`category-name-${parentId ?? "root"}`} className="text-sm font-medium">{t("category.name")}</label>
            <input
              id={`category-name-${parentId ?? "root"}`}
              autoFocus
              maxLength={100}
              disabled={loading}
              onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void handleSubmit(); } }}
              className="h-[44px] rounded-none border border-border bg-background px-3 text-sm"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder={t("category.placeholder")}
            />
          </div>

          {parentId && (
            <p className="text-xs text-muted-foreground">
              {t("category.child_note")}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
            className="h-[44px]"
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !categoryName.trim()}
            className="h-[44px]"
          >
            {loading ? t("common.adding") : t("common.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
