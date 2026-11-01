"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpRight, BarChart3, Bot, ClipboardList, LayoutDashboard, LogOut, MessageCircle, Package, Search, Users, type LucideIcon } from "lucide-react";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@admin/components/ui/sheet";
import { adminLogout } from "@admin/utils/logout";
import { AdminSummary, AdminView, messagesBadge, ordersBadge } from "@admin/lib/adminNav";
import { STORE } from "@/config/store";

export type { AdminView } from "@admin/lib/adminNav";

type NavItem = { id: AdminView; label: string; short: string; icon: LucideIcon; badge?: number; badgeLabel?: string; note?: string };

const LOCALES = [
  { code: "mn", label: "Монгол" },
  { code: "en", label: "English" },
];

/** The sections of the admin, in the order the owner uses them. */
export function useNavItems(summary: AdminSummary) {
  const { t } = useI18n();
  const orders = ordersBadge(summary);
  const messages = messagesBadge(summary);
  const main: NavItem[] = [
    { id: "overview", label: t("nav.overview"), short: t("nav.overview_short"), icon: LayoutDashboard },
    { id: "orders", label: t("nav.orders"), short: t("nav.orders_short"), icon: ClipboardList, badge: orders, badgeLabel: t("nav.orders_badge", { count: orders }) },
    { id: "messages", label: t("nav.messages"), short: t("nav.messages_short"), icon: MessageCircle, badge: messages, badgeLabel: t("nav.messages_badge", { count: messages }) },
    { id: "products", label: t("nav.products"), short: t("nav.products_short"), icon: Package },
    { id: "customers", label: t("nav.customers"), short: t("nav.customers_short"), icon: Users },
    { id: "revenue", label: t("nav.revenue"), short: t("nav.revenue"), icon: BarChart3 },
  ];
  const settings: NavItem[] = [
    { id: "assistant", label: t("nav.assistant"), short: t("nav.assistant"), icon: Bot, note: summary.bot && !summary.bot.enabled ? t("nav.assistant_off") : undefined },
  ];
  return { main, settings };
}

function Badge({ count, label }: { count?: number; label?: string }) {
  if (!count) return null;
  return (
    <span className="min-w-[22px] bg-terracotta px-[6px] py-[1px] text-center text-[12px] font-medium tabular-nums text-paper">
      <span aria-hidden>{count > 99 ? "99+" : count}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

type Props = {
  active: AdminView;
  onNavigate: (view: AdminView) => void;
  summary: AdminSummary;
  /** Opens the admin-wide search. */
  onSearch: () => void;
  /** Drawer mode on phones and tablets. */
  isMobile?: boolean;
  open?: boolean;
  onClose?: () => void;
};

/** Espresso sidebar with the serif wordmark: same identity as the storefront. */
export const Sidebar = ({ active, onNavigate, summary, onSearch, isMobile, open, onClose }: Props) => {
  const { t, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const [email, setEmail] = useState<string | null>(null);
  const { main, settings } = useNavItems(summary);

  useEffect(() => setEmail(localStorage.getItem("adminEmail")), []);

  const switchLocale = (code: string) => {
    const rest = pathname.replace(/^\/admin(\/(mn|en))?/, "");
    const query = typeof window !== "undefined" ? window.location.search : "";
    router.push(`/admin/${code}${rest}${query}`);
  };

  const go = (id: AdminView) => {
    onNavigate(id);
    onClose?.();
  };

  const item = ({ id, label, icon: Icon, badge, badgeLabel, note }: NavItem) => {
    const isActive = active === id;
    return (
      <button
        key={id}
        type="button"
        onClick={() => go(id)}
        aria-current={isActive ? "page" : undefined}
        className={`relative flex min-h-[44px] w-full items-center gap-[12px] px-[12px] text-left text-[14px] transition-colors duration-150 ${
          isActive ? "bg-paper/[0.12] font-medium text-paper" : "text-paper/75 hover:bg-paper/[0.06] hover:text-paper"
        }`}
      >
        <span className={`absolute bottom-[8px] left-0 top-[8px] w-[2px] bg-paper ${isActive ? "opacity-100" : "opacity-0"}`} />
        <Icon aria-hidden className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {note && <span className="border border-paper/40 px-[6px] text-[11px] text-paper/80">{note}</span>}
        <Badge count={badge} label={badgeLabel} />
      </button>
    );
  };

  const content = (
    <div className="flex h-full w-full flex-col bg-espresso text-paper">
      <Link href={`/admin/${locale}/home-page`} onClick={onClose} className="px-[24px] pb-[24px] pt-[28px]">
        <span className="store-heading block text-[28px] !text-paper">{STORE.name}</span>
        <span className="mt-[4px] block text-[12px] text-paper/65">{t("nav.workspace")}</span>
      </Link>

      <div className="px-[12px] pb-[12px]">
        <button
          type="button"
          onClick={onSearch}
          className="flex min-h-[44px] w-full items-center gap-[10px] border border-paper/15 px-[12px] text-left text-[13px] text-paper/75 transition-colors hover:border-paper/30 hover:text-paper"
        >
          <Search aria-hidden className="h-[16px] w-[16px] shrink-0" strokeWidth={1.6} />
          <span className="min-w-0 flex-1 truncate">{t("nav.search_hint")}</span>
          <kbd aria-hidden className="hidden border border-paper/20 px-[5px] font-sans text-[11px] text-paper/60 lg:inline">Ctrl K</kbd>
        </button>
      </div>

      <nav aria-label={t("nav.label")} className="flex flex-1 flex-col overflow-y-auto px-[12px]">
        <div className="flex flex-col gap-[2px]">{main.map(item)}</div>
        <p className="mb-[6px] mt-[20px] px-[12px] text-[12px] text-paper/55">{t("nav.settings_group")}</p>
        <div className="flex flex-col gap-[2px]">{settings.map(item)}</div>
      </nav>

      <div className="space-y-[10px] border-t border-paper/10 px-[24px] py-[16px]">
        <Link href={`/${locale}`} target="_blank" className="flex min-h-[44px] items-center justify-between gap-2 text-[13px] text-paper/85 hover:text-paper">
          {t("nav.visit_store")}
          <ArrowUpRight aria-hidden className="h-4 w-4" />
          <span className="sr-only">({t("common.opens_new_tab")})</span>
        </Link>
        <div className="flex gap-[2px]" role="group" aria-label={t("nav.language")}>
          {LOCALES.map((l) => (
            <button
              key={l.code}
              type="button"
              lang={l.code}
              onClick={() => switchLocale(l.code)}
              aria-pressed={locale === l.code}
              className={`h-[40px] flex-1 px-[10px] text-[12px] font-medium transition-colors ${
                locale === l.code ? "bg-paper text-ink" : "text-paper/70 hover:bg-paper/[0.06] hover:text-paper"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
        {email && (
          <p className="truncate pt-[4px] text-[12px] text-paper/65" title={t("nav.signed_in_as", { email })}>
            <span className="sr-only">{t("nav.signed_in_as", { email })}</span>
            <span aria-hidden>{email}</span>
          </p>
        )}
        <button
          type="button"
          onClick={() => adminLogout(router.push)}
          className="flex min-h-[44px] items-center gap-[10px] text-[13px] text-paper/80 transition-colors hover:text-paper"
        >
          <LogOut aria-hidden className="h-[16px] w-[16px]" strokeWidth={1.5} />
          {t("nav.logout")}
        </button>
      </div>
    </div>
  );

  if (!isMobile) return content;

  return (
    <Sheet open={!!open} onOpenChange={(v) => (!v ? onClose?.() : null)}>
      <SheetContent side="left" className="w-[280px] max-w-[85vw] border-0 p-0 [&>button]:text-paper">
        <SheetTitle className="sr-only">{t("nav.menu")}</SheetTitle>
        <SheetDescription className="sr-only">{t("nav.menu_hint")}</SheetDescription>
        {content}
      </SheetContent>
    </Sheet>
  );
};
