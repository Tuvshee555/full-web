"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@admin/components/ui/button";

type Props = {
  loading: boolean;
  hasData: boolean;
  page: number;
  totalPages: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  t: (key: string, params?: Record<string, number>) => string;
};

export function PaginationControls({
  loading,
  hasData,
  page,
  totalPages,
  setPage,
  t,
}: Props) {
  if (loading || !hasData) return null;

  return (
    <div className="flex items-center justify-between mt-6">
      <Button
        variant="ghost"
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        disabled={page === 1}
      >
        <ChevronLeft className="w-4 h-4" />
        {t("previous")}
      </Button>

      <div className="text-sm text-muted-foreground">
        {t("page_of", { page, total: totalPages })}
      </div>

      <Button
        variant="ghost"
        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        disabled={page === totalPages}
      >
        {t("next")}
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
