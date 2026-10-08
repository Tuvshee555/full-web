"use client";

import { Home, Grid, User } from "lucide-react";
import { usePathname } from "next/navigation";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import Link from "next/link";

interface MobileBottomNavProps {
  onOpenProfile: () => void;
}

export default function MobileBottomNav({
  onOpenProfile,
}: MobileBottomNavProps) {
  const pathname = usePathname() ?? "/";
  const { t, locale } = useI18n();

  const items = [
    {
      href: `/${locale}`,
      label: t("home"),
      icon: <Home className="w-5 h-5" />,
    },
    {
      href: `/${locale}/category/all`,
      label: t("categories"),
      icon: <Grid className="w-5 h-5" />,
    },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between px-3 py-2">
        {/* ROUTING ITEMS */}
        {items.map((it) => {
          const active =
            pathname === it.href || pathname.startsWith(it.href + "/");

          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 text-xs h-[56px] rounded-md
                ${
                  active
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground"
                }
              `}
              aria-current={active ? "page" : undefined}
            >
              {it.icon}
              <span>{it.label}</span>
            </Link>
          );
        })}

        {/* PROFILE → SHEET (NO ROUTE) */}
        <button
          type="button"
          onClick={onOpenProfile}
          className="flex-1 flex flex-col items-center justify-center gap-1 text-xs h-[56px] rounded-md text-muted-foreground hover:text-foreground"
        >
          <User className="w-5 h-5" />
          <span>{t("profile")}</span>
        </button>
      </div>
    </nav>
  );
}
