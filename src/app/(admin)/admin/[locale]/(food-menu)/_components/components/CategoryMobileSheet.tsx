"use client";

import { ReactNode, useEffect } from "react";

export default function CategoryMobileSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      aria-modal="true"
      role="dialog"
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative w-full md:max-w-md bg-background rounded-t-xl md:rounded-xl shadow-lg overflow-hidden"
        style={{ maxHeight: "85vh" }}
      >
        <div className="p-3 border-b border-border flex items-center justify-between">
          <div className="text-sm font-medium">Categories</div>
          <button
            onClick={onClose}
            className="h-[36px] w-[36px] flex items-center justify-center rounded hover:bg-muted"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-2 overflow-auto">{children}</div>
      </div>
    </div>
  );
}
