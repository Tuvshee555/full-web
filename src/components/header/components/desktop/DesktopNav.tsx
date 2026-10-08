/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { SearchDialog } from "../../SearchDialog";
import { SheetRight } from "../../sheetRight/SheetRight";

type CategoryNode = {
  id: string;
  categoryName: string;
  parentId: string | null;
};

export default function DesktopNav({
  locale,
  t,
  category,
  scrolled,
  showTopBar,
  hidden,
  allProductsRef,
  openMega,
  closeMegaWithDelay,
  onOpenProfile,
  firstLetter,
  cartCount,
}: any) {
  return (
    <header
      className={`fixed left-0 w-full z-[59] hidden md:block
        transition-all duration-300 ease-out
        ${hidden ? "-translate-y-full" : "translate-y-0"}
        ${showTopBar ? "top-9" : "top-0"}
        ${
          scrolled
            ? "bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm"
            : "bg-background/95 border-b border-border/50"
        }
      `}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="h-[64px] flex items-center justify-between">
          {/* Logo */}
          <Link
            href={`/${locale}/home-page`}
            className="flex items-center gap-2.5 shrink-0"
          >
            <img src="/order1.png" className="w-8 h-8 rounded-md" alt="logo" />
            <span className="text-foreground text-xl font-black tracking-tight">
              Nomad Edge
            </span>
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-8">
            <Link
              ref={allProductsRef}
              href={`/${locale}/category/all`}
              onMouseEnter={openMega}
              onMouseLeave={closeMegaWithDelay}
              className="relative h-[64px] flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors
                after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-primary after:transition-all hover:after:w-full"
            >
              {t("all_products")}
            </Link>

            {category
              .filter((c: CategoryNode) => c.parentId === null)
              .map((c: CategoryNode) => (
                <Link
                  key={c.id}
                  href={`/${locale}/category/${c.id}`}
                  className="relative h-[64px] flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors
                    after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-primary after:transition-all hover:after:w-full"
                >
                  {c.categoryName}
                </Link>
              ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <SearchDialog />
            <SheetRight cartCount={cartCount} />
            <motion.button
              onClick={() => onOpenProfile?.()}
              whileTap={{ scale: 0.97 }}
              className="w-[40px] h-[40px] rounded-full border border-border flex items-center justify-center text-sm font-semibold hover:bg-muted transition-colors"
            >
              {firstLetter}
            </motion.button>
          </div>
        </div>
      </div>
    </header>
  );
}
