"use client";

export type AdminTab = {
  id: string;
  label: string;
  /** Optional count shown next to the label. */
  count?: number;
  /** Paint the count in the attention colour when it is above zero (for example orders waiting to ship). */
  urgent?: boolean;
};

/** The one tab bar of the admin: underline tabs, 44px tall, scrolls sideways on a phone. */
export function AdminTabs({ tabs, value, onChange, label }: { tabs: AdminTab[]; value: string; onChange: (id: string) => void; label?: string }) {
  return (
    <div className="-mx-[16px] mb-[16px] overflow-x-auto px-[16px] md:mx-0 md:px-0">
      <div role="tablist" aria-label={label} className="flex min-w-max gap-[4px] border-b border-ink/10">
        {tabs.map((tab) => {
          const active = value === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.id)}
              className={`relative flex h-[44px] items-center gap-[8px] px-[14px] text-[14px] transition-colors duration-200 ${
                active ? "font-medium text-ink" : "text-taupe hover:text-ink"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={`min-w-[22px] px-[7px] py-[1px] text-center text-[11px] tabular-nums ${
                    active ? "bg-ink text-paper" : tab.urgent && tab.count > 0 ? "bg-terracotta text-paper" : "bg-sand text-taupe"
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
