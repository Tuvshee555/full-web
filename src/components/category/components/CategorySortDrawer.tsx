"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
  DrawerTitle,
} from "@/components/ui/drawer";

type SortType = "newest" | "oldest" | "low" | "high" | "discounted";

export function CategorySortDrawer({
  value,
  onChange,
}: {
  value: SortType;
  onChange: (v: SortType) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  const options: { value: SortType; label: string }[] = [
    { value: "discounted", label: t("sort_discounted_first") },
    { value: "newest", label: t("sort_newest") },
    { value: "oldest", label: t("sort_oldest") },
    { value: "low", label: t("sort_price_low") },
    { value: "high", label: t("sort_price_high") },
  ];

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      {/* TRIGGER */}
      <DrawerTrigger asChild>
        <button className="flex-1 h-[44px] rounded-md border border-border bg-card text-sm font-medium">
          {t("sort")}
        </button>
      </DrawerTrigger>

      {/* CONTENT */}
      <DrawerContent className="px-4 pb-6">
        <DrawerTitle className="text-center text-sm font-semibold py-3">
          {t("sort")}
        </DrawerTitle>

        <div className="divide-y divide-border">
          {options.map((opt) => {
            const active = value === opt.value;

            return (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className="
                  w-full flex items-center justify-between
                  py-3 text-sm
                "
              >
                <span className={active ? "font-medium text-primary" : ""}>
                  {opt.label}
                </span>

                {active && <Check className="w-4 h-4 text-primary" />}
              </button>
            );
          })}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
