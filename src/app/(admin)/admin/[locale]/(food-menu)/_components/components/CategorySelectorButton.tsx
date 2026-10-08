"use client";

import { useMemo } from "react";

export default function CategorySelectorButton({
  selected,
  onOpen,
}: {
  selected: { id: string; categoryName: string } | null;
  onOpen: () => void;
}) {
  const label = useMemo(
    () => (selected ? selected.categoryName : "Select category"),
    [selected]
  );

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onOpen}
        className="
          w-full
          text-left
          px-4 py-3
          rounded-lg
          border border-border
          bg-card
          hover:bg-muted
        "
        aria-haspopup="dialog"
        aria-expanded="false"
      >
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium truncate">{label}</div>
          <div className="text-xs text-muted-foreground">⌄</div>
        </div>
      </button>
    </div>
  );
}
