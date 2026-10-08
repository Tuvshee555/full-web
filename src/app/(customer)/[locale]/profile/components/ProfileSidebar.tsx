"use client";

import { LogOut, User, Package, Ticket, LayoutDashboard, ChevronRight } from "lucide-react";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import { Tab } from "../ProfileInner";

type Props = {
  email: string;
  activeTab: Tab;
  skeleton: boolean;
  onChangeTab: (tab: Tab) => void;
  onLogout: () => void;
};

export function ProfileSidebar({
  email,
  activeTab,
  skeleton,
  onChangeTab,
  onLogout,
}: Props) {
  const { t } = useI18n();
  const firstLetter = email ? email[0].toUpperCase() : "?";

  const navItems: { key: Tab; icon: React.ElementType; label: string; sub: string }[] = [
    { key: "dashboard", icon: LayoutDashboard, label: t("profile_dashboard"), sub: t("dashboard_sub") },
    { key: "profile",   icon: User,            label: t("profile_personal"),  sub: t("profile_sub") },
    { key: "orders",    icon: Package,          label: t("profile_orders"),    sub: t("yourOrders") },
    { key: "tickets",   icon: Ticket,           label: t("profile_tickets"),   sub: t("yourTickets") },
  ];

  return (
    <aside className="hidden lg:block lg:w-[280px] bg-card border border-border rounded-2xl p-4 sticky top-24 self-start">
      {/* Avatar + email */}
      <div className="flex flex-col items-center pt-4 pb-6 border-b border-border mb-2">
        <div className={`w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20
          flex items-center justify-center text-xl font-bold text-primary
          ${skeleton ? "animate-pulse" : ""}`}>
          {!skeleton && firstLetter}
        </div>

        <div className="mt-3 text-center min-w-0 w-full px-2">
          {skeleton ? (
            <div className="space-y-2 flex flex-col items-center">
              <div className="h-4 w-32 rounded-md bg-muted animate-pulse" />
              <div className="h-3 w-24 rounded-md bg-muted/60 animate-pulse" />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground truncate">
              {email || t("guest")}
            </p>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="space-y-1 py-2">
        {skeleton ? (
          <SkeletonNav />
        ) : (
          navItems.map((item) => {
            const active = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onChangeTab(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors group
                  ${active ? "bg-muted" : "hover:bg-muted"}`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors shrink-0
                  ${active ? "bg-background" : "bg-muted group-hover:bg-background"}`}>
                  <item.icon className={`w-4 h-4 transition-colors
                    ${active ? "text-primary" : "text-muted-foreground group-hover:text-primary"}`} />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.sub}</p>
                </div>
                <ChevronRight className={`w-4 h-4 shrink-0 transition-opacity
                  ${active ? "text-primary opacity-100" : "text-muted-foreground opacity-0 group-hover:opacity-100"}`} />
              </button>
            );
          })
        )}
      </nav>

      {/* Logout */}
      <div className="border-t border-border pt-2 mt-2">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
            text-destructive hover:bg-destructive/10 transition-colors"
        >
          <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center">
            <LogOut className="w-4 h-4 text-destructive" />
          </div>
          <span className="text-sm font-medium">{t("logout")}</span>
        </button>
      </div>
    </aside>
  );
}

function SkeletonNav() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5">
          <div className="w-9 h-9 rounded-lg bg-muted animate-pulse" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-24 bg-muted animate-pulse rounded" />
            <div className="h-3 w-16 bg-muted/60 animate-pulse rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
