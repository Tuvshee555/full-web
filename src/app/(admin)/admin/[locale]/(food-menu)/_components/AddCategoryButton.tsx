"use client";

import { API_BASE_URL } from "@admin/lib/api";
import { useState } from "react";
import axios from "axios";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@admin/components/ui/button";
import {
  Dialog,
  DialogContent,
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
  variant?: "primary" | "icon";
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

  const handleSubmit = async () => {
    if (!categoryName.trim()) return;
    if (!token) {
      toast.error(t("unauthorized"));
      return;
    }

    try {
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
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === "primary" ? (
          <Button variant="outline" size="sm" className="gap-1.5 h-8" title={tooltip}>
            <Plus className="w-4 h-4" />
            <span>{label ?? t("category.add")}</span>
          </Button>
        ) : (
          <button
            type="button"
            className="inline-flex items-center justify-center h-[28px] w-[28px] rounded-md border border-border hover:bg-muted"
            title={tooltip}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[400px] bg-card text-foreground">
        <DialogHeader>
          <DialogTitle>{t("category.add")}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">{t("category.name")}</label>
            <input
              className="h-[44px] rounded-md border border-border bg-background px-3 text-sm"
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
            className="h-[44px]"
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="h-[44px]"
          >
            {loading ? t("common.adding") : t("common.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
