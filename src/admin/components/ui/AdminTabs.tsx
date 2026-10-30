"use client";

import { useRef } from "react";

export type AdminTab = {
  id: string;
  label: string;
  /** Optional count shown next to the label. */
  count?: number;
  /** Paint the count in the attention colour when it is above zero (for example orders waiting to ship). */
  urgent?: boolean;
};

/** The one tab bar of the admin: underline tabs, 44px tall, scrolls sideways on a phone, arrow keys move between tabs. */
export function AdminTabs({ tabs, value, onChange, label }: { tabs: AdminTab[]; value: string; onChange: (id: string) => void; label?: string }) {
  const list = useRef<HTMLDivElement>(null);
  const move = (index: number) => {
    const next = tabs[(index + tabs.length) % tabs.length];
    onChange(next.id);
    list.current?.querySelector<HTMLButtonElement>(`[data-tab="${next.id}"]`)?.focus();
  };
  return (
    <div className="-mx-[16px] mb-[16px] overflow-x-auto px-[16px] md:mx-0 md:px-0">
      <div ref={list} role="tablist" aria-label={label} className="flex min-w-max gap-[2px] border-b border-ink/10">
        {tabs.map((tab, index) => {
          const active = value === tab.id;
          return (
            <button
              key={tab.id}
              data-tab={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(tab.id)}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight") { event.preventDefault(); move(index + 1); }
                if (event.key === "ArrowLeft") { event.preventDefault(); move(index - 1); }
              }}
              className={`relative flex h-[44px] items-center gap-[8px] px-[12px] text-[14px] transition-colors duration-150 ${
                active ? "font-medium text-ink" : "text-taupe hover:text-ink"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={`min-w-[22px] px-[6px] py-[1px] text-center text-[12px] tabular-nums ${
                    tab.urgent && tab.count > 0 ? "bg-terracotta text-paper" : active ? "bg-ink text-paper" : "bg-sand text-taupe"
                  }`}
                >
                  {tab.count}
                </span>
              )}
              {active && <span className="absolute inset-x-0 -bottom-px h-[2px] bg-ink" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
