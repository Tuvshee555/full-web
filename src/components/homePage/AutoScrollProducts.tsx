/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

import { useI18n } from "@/components/i18n/ClientI18nProvider";
import { FoodCard } from "../FoodCard";
import {
  TabKey,
  useAutoScrollProducts,
} from "./components/useAutoScrollProducts";
import { useFood } from "@/hooks/useFood";
import { fadeUp, scaleIn, staggerContainer } from "@/utils/animations";

const TAB_SUBTITLES: Record<TabKey, string> = {
  featured: "featured_collection",
  new: "new_arrivals_announcement",
  bestseller: "bestseller",
};

export const AutoScrollProducts = () => {
  const { locale, t } = useI18n();

  const { data: foods = [], isLoading } = useFood();

  const tabs: { key: TabKey; label: string }[] = [
    { key: "featured", label: t("featured") },
    { key: "new", label: t("new") },
    { key: "bestseller", label: t("bestseller") },
  ];

  const { activeTab, setActiveTab, filtered, scrollRef } =
    useAutoScrollProducts(foods);

  const tabButtonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  if (isLoading) {
    return (
      <div className="w-full mt-10 px-4">
        <p className="text-sm text-muted-foreground">{t("loading")}...</p>
      </div>
    );
  }

  return (
    <motion.div
      className="w-full flex flex-col gap-6 mt-12 px-4 max-w-7xl mx-auto"
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
    >
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-1">
            {t(TAB_SUBTITLES[activeTab])}
          </p>
          <h2 className="text-2xl font-bold tracking-tight">
            {tabs.find((tab) => tab.key === activeTab)?.label}
          </h2>
        </div>
        <Link
          href={`/${locale}/category/all`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t("view_all")} <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Tabs */}
      <motion.div
        className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        {tabs.map((tab, idx) => {
          const active = tab.key === activeTab;
          return (
            <motion.button
              key={tab.key}
              ref={(el) => { tabButtonsRef.current[idx] = el; }}
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.key)}
              variants={scaleIn}
              className={`shrink-0 px-5 py-2 rounded-full text-sm font-medium transition-all duration-200
                ${active
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
            >
              {tab.label}
            </motion.button>
          );
        })}
      </motion.div>

      {/* Products */}
      {filtered.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">
          {t("no_products_in_category")}
        </p>
      ) : (
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-1"
        >
          {filtered.map((item) => (
            <div
              key={item.id ?? item.foodId}
              data-auto-item
              className="snap-start w-[calc(50%-8px)] sm:w-[calc(33.333%-11px)] md:w-[calc(25%-12px)] lg:w-[calc(20%-13px)] shrink-0"
            >
              <FoodCard food={item} />
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default AutoScrollProducts;
