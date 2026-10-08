/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, ArrowLeft } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { SearchDialog } from "../../SearchDialog";
import { SheetRight } from "../../sheetRight/SheetRight";
import HeaderMobileSheet from "./HeaderMobileSheet";

type CategoryNode = {
  id: string;
  categoryName: string;
  parentId: string | null;
  children?: CategoryNode[];
};

export default function HeaderMobile({
  locale,
  t,
  tree,
  loading,
  mobileMenuOpen,
  setMobileMenuOpen,
  cartCount,
}: {
  locale: string;
  t: (k: string, def?: string) => string;
  tree: CategoryNode[];
  loading: boolean;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (v: boolean) => void;
  cartCount: number;
}) {
  const pathname = usePathname() ?? `/${locale}`;
  const search = useSearchParams();
  const router = useRouter();

  /* hide / show on scroll */
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastScrollY.current) < 10) return;

      if (y > lastScrollY.current && y > 60) {
        setHidden(true);
      } else {
        setHidden(false);
      }

      lastScrollY.current = y;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const tab = search?.get("tab") ?? "";
  const pathAfterLocale = pathname.replace(`/${locale}`, "") || "/";

  const isFoodDetail = pathAfterLocale.startsWith("/food/");
  const isHome =
    pathAfterLocale === "/" ||
    pathAfterLocale === "/home-page" ||
    pathAfterLocale === "";
  const isCategory = pathAfterLocale.startsWith("/category");
  const isProfile = pathAfterLocale.startsWith("/profile");
  const isCheckout = pathAfterLocale.startsWith("/checkout");

  const title = (() => {
    if (isCheckout) return t("nav.checkout", "Захиалга");
    if (isHome) return null;
    if (isCategory || isFoodDetail) return t("nav.products");
    if (isProfile) {
      if (tab === "orders") return t("nav.orders");
      if (tab === "tickets") return t("nav.tickets");
      return t("nav.profile");
    }
    return null;
  })();

  const showBack = !!title;
  const showSearch = !showBack;
  const centerIsLogo = !showBack;

  return (
    <>
      <header
        className={`fixed top-0 left-0 w-full h-[64px] z-[59] md:hidden
          transition-transform duration-300 ease-out
          ${hidden ? "-translate-y-full" : "translate-y-0"}
          bg-background border-b
        `}
      >
        <div className="relative h-full px-4 flex items-center">
          {/* LEFT */}
          {showBack ? (
            <button
              aria-label={t("nav.back")}
              onClick={() => router.back()}
              className="w-10 h-10 flex items-center justify-center"
            >
              <ArrowLeft size={20} />
            </button>
          ) : (
            <button
              aria-label={t("nav.menu")}
              onClick={() => setMobileMenuOpen(true)}
              className="w-10 h-10 flex items-center justify-center"
            >
              <Menu size={20} />
            </button>
          )}

          {/* CENTER */}
          {centerIsLogo ? (
            <Link
              href={`/${locale}/home-page`}
              aria-label={t("nav.home")}
              className="absolute left-1/2 -translate-x-1/2 flex items-center"
            >
              <img
                src="/order1.png"
                className="w-8 h-8 object-contain"
                alt="logo"
              />
            </Link>
          ) : (
            <div className="absolute left-1/2 -translate-x-1/2">
              <h1 className="text-sm font-medium">{title}</h1>
            </div>
          )}

          {/* RIGHT */}
          <div className="ml-auto flex items-center gap-2">
            {showSearch && <SearchDialog />}
            <SheetRight cartCount={cartCount} />
          </div>
        </div>
      </header>

      {/* MOBILE MENU SHEET */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
          >
            <div
              className="absolute inset-0"
              onClick={() => setMobileMenuOpen(false)}
            />
            <HeaderMobileSheet
              locale={locale}
              t={t}
              tree={tree}
              loading={loading}
              onClose={() => setMobileMenuOpen(false)}
            />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
