"use client";

import { Menu } from "lucide-react";
import TranslateButton from "@admin/components/header/translate/TranslateButton";
import { STORE } from "@/config/store";

/** Mobile admin bar: menu + wordmark + language. */
export function AdminTopBar({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 flex h-[56px] items-center gap-[10px] border-b border-ink/10 bg-paper/95 px-[12px] backdrop-blur-md">
      <button onClick={onMenu} aria-label="Menu" className="flex h-[44px] w-[44px] items-center justify-center text-ink">
        <Menu className="h-[22px] w-[22px]" strokeWidth={1.1} />
      </button>
      <span className="store-heading text-[22px]">{STORE.name}</span>
      <div className="ml-auto">
        <TranslateButton />
      </div>
    </header>
  );
}
