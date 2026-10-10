"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, ClipboardList, LogOut, Package } from "lucide-react";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@admin/components/ui/sheet";
import { adminLogout } from "@admin/utils/logout";
import { STORE } from "@/config/store";

type Props = {
  setPage: (value: string) => void;
  isMobile?: boolean;
  open?: boolean;
  onClose?: () => void;
};

/** Espresso sidebar with the serif wordmark: same identity as the storefront. */
export const Sidebar = ({ setPage, isMobile, open, onClose }: Props) => {
  const { t } = useI18n();
  const router = useRouter();
  const [active, setActive] = useState("Food-menu");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => setEmail(localStorage.getItem("adminEmail")), []);

  const nav = [
    { id: "Food-menu", label: t("sidebar.food_menu"), icon: Package },
    { id: "Orders", label: t("sidebar.orders"), icon: ClipboardList },
    { id: "Revenue-dashboard", label: t("sidebar.revenue"), icon: BarChart3 },
  ];

  const go = (id: string) => {
    setActive(id);
    setPage(id);
    onClose?.();
  };

  const content = (
    <aside className="flex h-full w-[248px] flex-col bg-espresso text-paper">
      <Link href="/admin" className="px-[26px] pb-[26px] pt-[30px]">
        <span className="store-heading block text-[30px] !text-paper">{STORE.name}</span>
        <span className="eyebrow mt-[4px] !text-paper/45">Admin</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-[2px] px-[14px]">
        {nav.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => go(id)}
              className={`group relative flex w-full items-center gap-[12px] px-[12px] py-[11px] text-left text-[14px] transition-colors duration-300 ${
                isActive ? "bg-paper/10 text-paper" : "text-paper/60 hover:bg-paper/5 hover:text-paper"
              }`}
            >
              <span className={`absolute left-0 top-[8px] bottom-[8px] w-[2px] bg-paper transition-opacity ${isActive ? "opacity-100" : "opacity-0"}`} />
              <Icon className="h-[17px] w-[17px]" strokeWidth={1.3} />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-paper/10 px-[26px] py-[20px]">
        {email && <p className="truncate text-[12px] text-paper/45">{email}</p>}
        <button
          type="button"
          onClick={() => adminLogout(router.push)}
          className="mt-[10px] flex items-center gap-[10px] text-[13px] text-paper/70 transition-colors hover:text-paper"
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
      <SheetContent side="left" className="w-[248px] border-0 p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>{t("sidebar.title")}</SheetTitle>
        </SheetHeader>
        {content}
      </SheetContent>
    </Sheet>
  );
};
