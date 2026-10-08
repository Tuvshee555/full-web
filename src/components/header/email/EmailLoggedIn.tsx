"use client";

import { LogOut, User, Package, Ticket, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import { handleLogout } from "./handlers/handleLogout";

interface EmailLoggedInProps {
  email: string;
  firstLetter: string;
  clearToken: () => void;
  closeSheet: () => void;
}

export const EmailLoggedIn = ({
  email,
  firstLetter,
  clearToken,
  closeSheet,
}: EmailLoggedInProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, t } = useI18n();

  const activeTab = searchParams.get("tab");

  const navItems = [
    {
      key: "profile",
      icon: User,
      label: t("profile_personal"),
      sub: t("yourInfo"),
      href: `/${locale}/profile?tab=profile`,
    },
    {
      key: "orders",
      icon: Package,
      label: t("profile_orders"),
      sub: t("yourOrders"),
      href: `/${locale}/profile?tab=orders`,
    },
    {
      key: "tickets",
      icon: Ticket,
      label: t("profile_tickets"),
      sub: t("yourTickets"),
      href: `/${locale}/profile?tab=tickets`,
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header with avatar */}
      <div className="px-6 pt-8 pb-6 border-b border-border">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 border-2 border-primary/20
            flex items-center justify-center shrink-0">
            <span className="text-xl font-bold text-primary">{firstLetter}</span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-base leading-tight truncate">
              {t("guest")}
            </p>
            <p className="text-sm text-muted-foreground truncate max-w-[180px]">{email}</p>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const active = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => {
                closeSheet();
                router.push(item.href);
              }}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors group
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
              <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-6 border-t border-border pt-3">
        <button
          onClick={() => {
            closeSheet();
            handleLogout(router, clearToken, locale);
          }}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl
            text-destructive hover:bg-destructive/10 transition-colors"
        >
          <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center">
            <LogOut className="w-4 h-4 text-destructive" />
          </div>
          <span className="text-sm font-medium">{t("logout")}</span>
        </button>
      </div>
    </div>
  );
};
