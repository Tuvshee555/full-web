"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@admin/components/ui/dialog";
import { Button } from "@admin/components/ui/button";
import { useCategory } from "@admin/provider/CategoryProvider";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";

export const AddCategoryModal = () => {
  const { t } = useI18n();
  const { category, setCategory, postData } = useCategory();

  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold">{t("category.title")}</h2>

      <Dialog>
        <DialogTrigger asChild>
          <Button size="icon" className="h-[44px] w-[44px] rounded-full">
            +
          </Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{t("category.add_title")}</DialogTitle>
            <DialogDescription>
              {t("category.add_description")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="name" className="text-sm text-muted-foreground">
                {t("category.name")}
              </label>

              <input
                id="name"
                className="
                  col-span-3
                  h-[44px]
                  rounded-none
                  border border-border
                  bg-background
                  px-3
                  text-sm
                  text-foreground
                "
                value={category.name ?? ""}
                onChange={(e) =>
                  setCategory((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button onClick={postData}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};
