"use client";

import Link from "next/link";
import { useRef } from "react";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

import { useCategory } from "@/hooks/useCategory";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import type { Datas } from "@/type/type";
import { scaleIn, staggerContainer } from "@/utils/animations";

export const HeroCategoryStrip = () => {
  const { locale } = useI18n();
  const pathname = usePathname();

  const { data: categories } = useCategory();
  const safeCategories: Datas[] = categories ?? [];

  const scrollRef = useRef<HTMLDivElement>(null);
  const activeId = pathname?.split("/category/")[1];

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });
  };

  const topLevel = safeCategories.filter((c) => c.parentId === null);

  return (
    <section className="sticky top-[64px] z-30 bg-background/95 backdrop-blur-sm border-t border-b border-border/50">
      <div className="relative max-w-7xl mx-auto px-4 py-3">
        {/* Desktop arrows */}
        <button
          onClick={() => scroll("left")}
          className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-10
            h-8 w-8 items-center justify-center rounded-full
            bg-background border border-border shadow-sm hover:bg-muted transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={() => scroll("right")}
          className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-10
            h-8 w-8 items-center justify-center rounded-full
            bg-background border border-border shadow-sm hover:bg-muted transition-colors"
        >
          <ChevronRight size={16} />
        </button>

        {/* Edge fades */}
        <div className="pointer-events-none absolute left-0 top-0 h-full w-10 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-background to-transparent z-10" />

        {/* Pill tabs */}
        <motion.div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide mx-6 md:mx-8"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          {topLevel.map((cat) => {
            const isActive = activeId === cat.id;
            return (
              <motion.div key={cat.id} variants={scaleIn}>
                <Link
                  href={`/${locale}/category/${cat.id}`}
                  className={`
                    shrink-0 inline-flex px-5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap
                    transition-all duration-200
                    ${isActive
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    }
                  `}
                >
                  {cat.categoryName}
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroCategoryStrip;
