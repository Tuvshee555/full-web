"use client";

import { Button } from "@admin/components/ui/button";
import { RefreshCcw } from "lucide-react";

type Props = {
  t: (key: string) => string;
  loading: boolean;
  onRefresh: () => void;
  range: "7d" | "30d";
  setRange: (r: "7d" | "30d") => void;
};

export function DashboardHeader({
  t,
  loading,
  onRefresh,
  range,
  setRange,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 justify-between">
      <h1 className="store-heading text-[44px]">{t("dashboard")}</h1>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setRange("7d")}
          className={`px-[14px] py-[8px] text-[12px] ${range === "7d" ? "bg-ink text-paper" : "text-ink/70 shadow-[inset_0_0_0_1px_rgba(28,23,20,0.2)] hover:text-ink"}`}
        >
          7D
        </button>

        <button
          onClick={() => setRange("30d")}
          className={`px-[14px] py-[8px] text-[12px] ${range === "30d" ? "bg-ink text-paper" : "text-ink/70 shadow-[inset_0_0_0_1px_rgba(28,23,20,0.2)] hover:text-ink"}`}
        >
          30D
        </button>

        <Button onClick={onRefresh} disabled={loading} className="ml-2">
          <RefreshCcw className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
