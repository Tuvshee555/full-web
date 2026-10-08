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
      <h1 className="text-xl font-semibold">{t("dashboard")}</h1>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setRange("7d")}
          className={`px-3 py-1 text-xs rounded-full border ${
            range === "7d" ? "bg-foreground text-background" : "text-foreground"
          }`}
        >
          7D
        </button>

        <button
          onClick={() => setRange("30d")}
          className={`px-3 py-1 text-xs rounded-full border ${
            range === "30d"
              ? "bg-foreground text-background"
              : "text-foreground"
          }`}
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
