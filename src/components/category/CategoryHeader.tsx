"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import { Clock, DollarSign } from "lucide-react";

export const CategoryHeader = ({
  title,
  count,
  onSortChange,
}: {
  title: string;
  count: number;
  onSortChange: (sortType: string) => void;
}) => {
  const { t } = useI18n();
  const [sort, setSort] = useState("newest");

  const handleChange = (value: string) => {
    setSort(value);
    onSortChange(value);
  };

  return (
    <div
      className="
        flex flex-col gap-4
        sm:flex-row sm:items-center sm:justify-between
        border-b border-border pb-4
      "
    >
      {/* TITLE */}
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
        {title}
        <span className="text-muted-foreground text-sm ml-2">({count})</span>
      </h1>

      {/* SORT */}
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">
          {t("sort_by")}:
        </span>

        <Select value={sort} onValueChange={handleChange}>
          <SelectTrigger
            className="
              w-full sm:w-[200px]
              bg-background
              border border-border
              rounded-lg
              text-foreground
              font-medium
              shadow-sm
              hover:border-primary/40
              focus:ring-1 focus:ring-primary
              focus:border-primary
              transition
            "
          >
            <SelectValue placeholder={t("sorting")} />
          </SelectTrigger>

          <SelectContent
            className="
    bg-popover
    border border-border
    rounded-lg
    shadow-lg
    backdrop-blur
  "
          >
            <SelectItem value="newest">
              <div className="flex items-center gap-2 leading-none">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{t("sort_newest")}</span>
              </div>
            </SelectItem>

            <SelectItem value="oldest">
              <div className="flex items-center gap-2 leading-none">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{t("sort_oldest")}</span>
              </div>
            </SelectItem>

            <SelectItem value="low">
              <div className="flex items-center gap-2 leading-none">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <span>{t("sort_price_low")}</span>
              </div>
            </SelectItem>

            <SelectItem value="high">
              <div className="flex items-center gap-2 leading-none">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <span>{t("sort_price_high")}</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
