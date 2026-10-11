"use client";

import { Menu } from "lucide-react";
import { STORE } from "@/config/store";

/** Mobile admin bar: menu (with open-orders dot) + wordmark. Language lives in the menu. */
export function AdminTopBar({ onMenu, openOrders = 0 }: { onMenu: () => void; openOrders?: number }) {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 flex h-[56px] items-center gap-[10px] border-b border-ink/10 bg-paper/95 px-[12px] backdrop-blur-md">
      <button onClick={onMenu} aria-label="Menu" className="relative flex h-[44px] w-[44px] items-center justify-center text-ink">
        <Menu className="h-[22px] w-[22px]" strokeWidth={1.1} />
        {openOrders > 0 && <span className="absolute right-[9px] top-[10px] h-[8px] w-[8px] rounded-full bg-terracotta" />}
      </button>
      <span className="store-heading text-[22px]">{STORE.name}</span>
    </header>
  );
}
