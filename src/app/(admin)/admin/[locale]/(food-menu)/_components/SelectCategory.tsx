"use client";

import { API_BASE_URL } from "@admin/lib/api";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { CategoryType, SelectCategoryProps } from "@admin/type/type";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@admin/components/ui/dialog";
import { Button } from "@admin/components/ui/button";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";

export const SelectCategory: React.FC<SelectCategoryProps> = ({
  handleChange,
  updatedFood,
}) => {
  const { t } = useI18n();
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);

  const getCategories = async () => {
    try {
      const { data } = await axios.get<CategoryType[]>(
        `${API_BASE_URL}/category`
      );
      setCategories(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getCategories();
  }, []);

  const currentCategoryId = updatedFood?.categoryId ?? "";

  if (loading) {
    return <p className="text-sm text-muted-foreground">{t("loading")}</p>;
  }

  if (error) {
    return (
      <p className="text-sm text-muted-foreground">{t("error_loading")}</p>
    );
  }

  const selectedCategory =
    categories.find((c) => c.id === currentCategoryId)?.categoryName ??
    t("select_category");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start h-[44px]">
          {selectedCategory}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[480px] bg-card text-foreground">
        <DialogHeader>
          <DialogTitle>{t("select_category")}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-3">
          {categories.map((cat) => {
            const isSelected = cat.id === currentCategoryId;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  handleChange({ name: "category", value: cat.id });
                  setOpen(false);
                }}
                className={`
                  p-4 rounded-none text-left
                  border border-border
                  transition
                  ${isSelected ? "bg-muted" : "hover:bg-muted"}
                `}
              >
                <h3 className="text-sm font-medium">{cat.categoryName}</h3>
                <p className="text-xs text-muted-foreground">
                  {t("dish_count", { count: cat.foodCount })}
                </p>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end mt-4">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="h-[44px]"
          >
            {t("close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
