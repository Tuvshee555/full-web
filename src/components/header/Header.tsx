"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import TopBar from "./translate/TopBar";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import { useCategory } from "@/hooks/useCategory";
import { useCategoryTree } from "@/hooks/useCategoryTree";
import { useEmailSync } from "./email/hooks/useEmailSync";
import HeaderDesktop from "./components/desktop/HeaderDesktop";
import HeaderMobile from "./components/mobile/HeaderMobile";

export default function Header({
  compact = false,
  onOpenProfile,
  cartCount,
}: {
  compact?: boolean;
  onOpenProfile?: () => void;
  cartCount: number;
}) {
  const { locale, t } = useI18n();

  const { data: categoryData } = useCategory();
  const { data: treeData, isLoading: treeLoading } = useCategoryTree();

  const category = categoryData ?? [];
  const tree = treeData ?? [];

  const [showTopBar, setShowTopBar] = useState(true);
  const [scrolled, setScrolled] = useState(compact);
  const [megaVisible, setMegaVisible] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const hideTimeoutRef = useRef<number | null>(null);
  const allProductsRef = useRef<HTMLAnchorElement | null>(null);
  const [caretLeft, setCaretLeft] = useState(0);

  const email = useEmailSync();
  const firstLetter = email ? email[0].toUpperCase() : "?";

  useEffect(() => {
    if (compact) return;

    const handler = () => {
      const y = window.scrollY;
      setShowTopBar(y === 0);
      setScrolled(y > 0);
    };

    window.addEventListener("scroll", handler, { passive: true });
    handler();

    return () => window.removeEventListener("scroll", handler);
  }, [compact]);

  const openMega = () => {
    if (hideTimeoutRef.current) window.clearTimeout(hideTimeoutRef.current);
    setMegaVisible(true);

    if (allProductsRef.current) {
      const rect = allProductsRef.current.getBoundingClientRect();
      setCaretLeft(rect.left + rect.width / 2);
    }
  };

  const closeMegaWithDelay = () => {
    if (hideTimeoutRef.current) window.clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = window.setTimeout(
      () => setMegaVisible(false),
      200
    );
  };

  return (
    <>
      {/* TOP BAR — animated */}
      <AnimatePresence>
        {showTopBar && (
          <motion.div
            initial={{ y: -36, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -36, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed top-0 left-0 w-full z-[60] hidden md:block"
          >
            <TopBar />
          </motion.div>
        )}
      </AnimatePresence>

      <HeaderDesktop
        locale={locale}
        t={t}
        category={category}
        tree={tree}
        loading={treeLoading}
        scrolled={scrolled}
        showTopBar={showTopBar}
        megaVisible={megaVisible}
        caretLeft={caretLeft}
        allProductsRef={allProductsRef}
        openMega={openMega}
        closeMegaWithDelay={closeMegaWithDelay}
        onOpenProfile={onOpenProfile}
        firstLetter={firstLetter}
        cartCount={cartCount}
      />

      <HeaderMobile
        locale={locale}
        t={t}
        tree={tree}
        loading={treeLoading}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        cartCount={cartCount}
      />
    </>
  );
}
