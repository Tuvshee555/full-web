"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { AdminSummary, AdminView } from "@admin/lib/adminNav";
import { Sidebar, useNavItems } from "../Sidebar";
import { AdminSearch } from "../AdminSearch";

/** Phones and tablets: the four most used sections are one tap away; everything else is under "More". */
function BottomNav({ active, onNavigate, summary, onMore }: { active: AdminView; onNavigate: (view: AdminView) => void; summary: AdminSummary; onMore: () => void }) {
  const { t } = useI18n();
  const { main } = useNavItems(summary);
  // Customers and sales live under "More": the bar keeps five targets a thumb can hit.
  const tabs = main.filter((item) => item.id !== "revenue" && item.id !== "customers");
  const inMore = active === "revenue" || active === "customers" || active === "assistant";
  return (
    <nav
      aria-label={t("nav.label")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-white/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto grid h-[60px] max-w-[640px] grid-cols-5">
        {tabs.map(({ id, short, icon: Icon, badge, badgeLabel }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              aria-current={isActive ? "page" : undefined}
              className={`relative flex flex-col items-center justify-center gap-[3px] text-[11px] ${isActive ? "font-medium text-ink" : "text-taupe"}`}
            >
              {isActive && <span className="absolute inset-x-[18%] top-0 h-[2px] bg-ink" />}
              <span className="relative">
                <Icon aria-hidden className="h-[21px] w-[21px]" strokeWidth={isActive ? 1.9 : 1.5} />
                {!!badge && (
                  <span className="absolute -right-[11px] -top-[6px] min-w-[18px] bg-terracotta px-[4px] text-center text-[10px] font-medium leading-[16px] tabular-nums text-paper">
                    <span aria-hidden>{badge > 99 ? "99+" : badge}</span>
                  </span>
                )}
              </span>
              <span className="max-w-full truncate px-[2px]">{short}</span>
              {!!badge && <span className="sr-only">{badgeLabel}</span>}
            </button>
          );
        })}
        <button
          type="button"
          onClick={onMore}
          aria-current={inMore ? "page" : undefined}
          className={`relative flex flex-col items-center justify-center gap-[3px] text-[11px] ${inMore ? "font-medium text-ink" : "text-taupe"}`}
        >
          {inMore && <span className="absolute inset-x-[18%] top-0 h-[2px] bg-ink" />}
          <Menu aria-hidden className="h-[21px] w-[21px]" strokeWidth={1.5} />
          <span>{t("nav.more")}</span>
        </button>
      </div>
    </nav>
  );
}

export default function AdminLayout({
  children,
  active,
  onNavigate,
  summary,
}: {
  children: React.ReactNode;
  active: AdminView;
  onNavigate: (view: AdminView) => void;
  summary: AdminSummary;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const openSearch = () => {
    setOpen(false);
    setSearchOpen(true);
  };

  return (
    <div className="min-h-screen w-full lg:flex">
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-white focus:p-3">{t("nav.skip")}</a>
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 lg:block">
        <Sidebar active={active} onNavigate={onNavigate} summary={summary} onSearch={openSearch} />
      </aside>

      <Sidebar active={active} onNavigate={onNavigate} summary={summary} onSearch={openSearch} isMobile open={open} onClose={() => setOpen(false)} />
      <AdminSearch open={searchOpen} onOpenChange={setSearchOpen} />
      <BottomNav active={active} onNavigate={onNavigate} summary={summary} onMore={() => setOpen(true)} />

      <main
        id="admin-main"
        tabIndex={-1}
        className="w-full min-w-0 flex-1 px-[16px] pt-[20px] outline-none md:px-[24px] lg:px-[32px] lg:py-[32px]"
        style={{ paddingBottom: "calc(var(--admin-tabbar) + 32px)" }}
      >
        <div className="mx-auto w-full max-w-[1400px]">{children}</div>
      </main>
    </div>
  );
}
