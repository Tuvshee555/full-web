"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, ClipboardList, LogOut, Package, MessageCircle } from "lucide-react";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@admin/components/ui/sheet";
import { adminLogout } from "@admin/utils/logout";
import { STORE } from "@/config/store";

export type AdminView = "products" | "orders" | "revenue" | "chatbot";

type Props = {
  active: AdminView;
  onNavigate: (view: AdminView) => void;
  /** Orders that still need the admin to do something (shown as a badge). */
  openOrders?: number;
  isMobile?: boolean;
  open?: boolean;
  onClose?: () => void;
};

const LOCALES = [
  { code: "mn", label: "MN" },
  { code: "en", label: "EN" },
];

/** Espresso sidebar with the serif wordmark: same identity as the storefront. */
export const Sidebar = ({ active, onNavigate, openOrders = 0, isMobile, open, onClose }: Props) => {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => setEmail(localStorage.getItem("adminEmail")), []);

  const locale = pathname.split("/")[2] || "mn";
  const switchLocale = (code: string) => {
    const rest = pathname.replace(/^\/admin(\/(mn|en|ko))?/, "");
    const query = typeof window !== "undefined" ? window.location.search : "";
    router.push(`/admin/${code}${rest}${query}`);
  };

  const nav: { id: AdminView; label: string; icon: typeof Package; badge?: number }[] = [
    { id: "products", label: t("sidebar.food_menu"), icon: Package },
    { id: "orders", label: t("sidebar.orders"), icon: ClipboardList, badge: openOrders },
    { id: "revenue", label: t("sidebar.revenue"), icon: BarChart3 },
    { id: "chatbot", label: t("chatbot.title"), icon: MessageCircle },
  ];

  const go = (id: AdminView) => {
    onNavigate(id);
    onClose?.();
  };

  const content = (
    <aside className="flex h-full w-[248px] flex-col bg-espresso text-paper">
      <Link href="/admin" className="px-[26px] pb-[26px] pt-[30px]">
        <span className="store-heading block text-[30px] !text-paper">{STORE.name}</span>
        <span className="eyebrow mt-[4px] !text-paper/45">Admin</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-[2px] px-[14px]">
        {nav.map(({ id, label, icon: Icon, badge }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => go(id)}
              aria-current={isActive ? "page" : undefined}
              className={`group relative flex w-full items-center gap-[12px] px-[12px] py-[11px] text-left text-[14px] transition-colors duration-300 ${
                isActive ? "bg-paper/10 text-paper" : "text-paper/70 hover:bg-paper/5 hover:text-paper"
              }`}
            >
              <span className={`absolute bottom-[8px] left-0 top-[8px] w-[2px] bg-paper transition-opacity ${isActive ? "opacity-100" : "opacity-0"}`} />
              <Icon className="h-[17px] w-[17px]" strokeWidth={1.3} />
              <span className="flex-1">{label}</span>
              {!!badge && (
                <span
                  className="min-w-[22px] rounded-full bg-terracotta px-[7px] py-[1px] text-center text-[11px] font-medium tabular-nums text-paper"
                  title={t("nav.open_orders", { count: badge })}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="space-y-[14px] border-t border-paper/10 px-[26px] py-[20px]">
        <div className="flex gap-[2px]" role="group" aria-label="Language">
          {LOCALES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => switchLocale(l.code)}
              aria-pressed={locale === l.code}
              className={`h-[28px] px-[10px] text-[11px] font-medium tracking-[0.1em] transition-colors ${
                locale === l.code ? "bg-paper text-ink" : "text-paper/60 hover:text-paper"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
        {email && <p className="truncate text-[12px] text-paper/55">{email}</p>}
        <button
          type="button"
          onClick={() => adminLogout(router.push)}
          className="flex items-center gap-[10px] text-[13px] text-paper/75 transition-colors hover:text-paper"
        >
          <LogOut className="h-[15px] w-[15px]" strokeWidth={1.3} />
          {t("sidebar.logout")}
        </button>
      </div>
    </aside>
  );

  if (!isMobile) return content;

  return (
    <Sheet open={!!open} onOpenChange={(v) => (!v ? onClose?.() : null)}>
      <SheetContent side="left" className="w-[248px] border-0 p-0 [&>button]:text-paper">
        <SheetHeader className="sr-only">
          <SheetTitle>{t("sidebar.title")}</SheetTitle>
        </SheetHeader>
        {content}
      </SheetContent>
    </Sheet>
  );
};
