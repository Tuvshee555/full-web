"use client";

import { X } from "lucide-react";
import CategoryTree from "../mobilesheet/CategoryTree";
import SheetFooter from "../mobilesheet/SheetFooter";

export type CategoryNode = {
  id: string;
  categoryName: string;
  parentId: string | null;
  children?: CategoryNode[];
};

export default function HeaderMobileSheet({
  locale,
  t,
  tree,
  loading,
  onClose,
}: {
  locale: string;
  t: (k: string, def?: string) => string;
  tree: CategoryNode[];
  loading: boolean;
  onClose: () => void;
}) {
  return (
    // positioned absolutely to left so it's anchored to the left side of the overlay
    <div className="absolute left-0 top-0 h-full w-[80vw] max-w-[380px] bg-background shadow-xl z-[81] overflow-hidden">
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div />
          <div className="font-semibold text-lg">{t("site_name")}</div>
          <button
            aria-label="close menu"
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 px-4 py-4 overflow-auto">
          {loading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : (
            <nav className="space-y-3 pb-6">
              <CategoryTree
                locale={locale}
                t={t}
                tree={tree}
                onClose={onClose}
              />

              {/* footer inside scrollable content */}
              <SheetFooter locale={locale} t={t} onClose={onClose} />
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
