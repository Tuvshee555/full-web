/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  UtensilsCrossed,
  ClipboardList,
  BarChart3,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@admin/components/ui/sheet";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Props = {
  setPage: (value: string) => void;
  isMobile?: boolean;
  open?: boolean;
  onClose?: () => void;
};

type NavItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
};

export const Sidebar = ({ setPage, isMobile, open, onClose }: Props) => {
  const { t } = useI18n();
  const router = useRouter();
  const [activePage, setActivePage] = useState("Food-menu");
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    setUserEmail(localStorage.getItem("adminEmail"));
  }, []);

  const navItems: NavItem[] = [
    {
      id: "Food-menu",
      label: t("sidebar.home"),
      icon: <UtensilsCrossed className="w-5 h-5" />,
    },
    {
      id: "Orders",
      label: t("sidebar.orders"),
      icon: <ClipboardList className="w-5 h-5" />,
    },
    {
      id: "Revenue-dashboard",
      label: t("sidebar.revenue"),
      icon: <BarChart3 className="w-5 h-5" />,
    },
  ];

  const handleClick = (id: string) => {
    setActivePage(id);
    setPage(id);
    onClose?.();
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminEmail");
    document.cookie = "adminToken=; path=/; max-age=0; SameSite=Strict";
    toast.success(t("sidebar.logout"));
    router.push("/admin/log-in");
  };

  const content = (
    <aside className="w-[240px] h-full flex flex-col bg-card border-r border-border">
      {/* Brand */}
      <Link
        href="/admin"
        className="flex items-center gap-3 px-5 py-5 border-b border-border hover:bg-muted/40 transition-colors"
      >
        <img src="/order.png" className="w-8 h-8 rounded-sm" alt="NomNom logo" />
        <div>
          <div className="font-semibold text-sm leading-tight">NomNom</div>
          <div className="text-xs text-muted-foreground leading-tight">
            {t("sidebar.tagline")}
          </div>
        </div>
      </Link>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
        {navItems.map((item) => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleClick(item.id)}
              className={`
                w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors
                ${
                  isActive
                    ? "bg-primary/10 text-primary font-medium border-l-2 border-primary pl-[10px]"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground border-l-2 border-transparent pl-[10px]"
                }
              `}
            >
              <span className="flex items-center gap-3">
                {item.icon}
                {item.label}
              </span>
              {isActive && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
            </button>
          );
        })}
      </nav>

      {/* Footer — user + logout */}
      <div className="border-t border-border px-3 py-3 space-y-1">
        {userEmail && (
          <div className="px-3 py-2">
            <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
          </div>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="w-5 h-5" />
          {t("sidebar.logout")}
        </button>
      </div>
    </aside>
  );

  if (!isMobile) return content;

  return (
    <Sheet open={!!open} onOpenChange={(v) => (!v ? onClose?.() : null)}>
      <SheetContent side="left" className="p-0 w-[260px]">
        <SheetHeader className="sr-only">
          <SheetTitle>{t("sidebar.title")}</SheetTitle>
        </SheetHeader>
        {content}
      </SheetContent>
    </Sheet>
  );
};
