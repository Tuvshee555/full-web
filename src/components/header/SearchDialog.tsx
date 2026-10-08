/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client";

import { API_BASE_URL } from "@/lib/api";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Search, X } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import { sanitizeFoodList } from "@/utils/catalogSanitizer";

export const SearchDialog = () => {
  const { t, locale } = useI18n();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [allFoods, setAllFoods] = useState<any[]>([]);
  const [filteredFoods, setFilteredFoods] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  /* ======================
     FETCH FOODS
     ====================== */
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/food`);
        const data = await res.json();
        if (Array.isArray(data)) setAllFoods(sanitizeFoodList(data));
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  /* ======================
     FILTER
     ====================== */
  useEffect(() => {
    if (!query.trim()) {
      setFilteredFoods([]);
      return;
    }
    const q = query.toLowerCase();
    setFilteredFoods(
      allFoods.filter((f) => f.foodName?.toLowerCase().includes(q))
    );
  }, [query, allFoods]);

  /* ======================
     HIGHLIGHT MATCH
     ====================== */
  const highlightMatch = (text: string, keyword: string) => {
    if (!keyword) return text;
    const regex = new RegExp(`(${keyword})`, "gi");
    return text.split(regex).map((part, i) =>
      part.toLowerCase() === keyword.toLowerCase() ? (
        <span key={i} className="text-primary font-semibold">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* TRIGGER */}
      <DialogTrigger asChild>
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.95 }}
          aria-label={t("search")}
          className="
            w-[42px] h-[42px] rounded-full
            flex items-center justify-center
            bg-background border border-border
            text-foreground
            hover:border-primary
            hover:shadow-[0_0_12px_hsl(var(--primary)/0.25)]
            transition
          "
        >
          <Search className="w-5 h-5" />
        </motion.button>
      </DialogTrigger>

      <AnimatePresence>
        {open && (
          <DialogContent
            className="
              w-[95%] max-w-[680px]
              bg-card text-card-foreground
              border border-border
              rounded-3xl
              shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)]
              p-6
            "
          >
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between mb-4">
                <span className="text-lg font-semibold text-primary">
                  {locale === "mn"
                    ? "Бүтээгдэхүүн хайх"
                    : t("search_food", "Search products")}
                </span>
                <button
                  onClick={() => setOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </DialogTitle>
            </DialogHeader>

            {/* INPUT */}
            <div className="relative mb-5">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={
                    locale === "mn"
                      ? "Бүтээгдэхүүний нэрээр хайх…"
                      : t("search_food_placeholder", "Search by product name…")
                  }
                className="
                  w-full rounded-2xl px-4 py-3 text-sm
                  bg-background border border-border
                  text-foreground placeholder:text-muted-foreground
                  focus:border-primary outline-none
                  transition
                "
              />
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>

            {/* RESULTS */}
            <div className="max-h-[360px] overflow-y-auto space-y-2">
              {loading && (
                <p className="text-muted-foreground text-center text-sm py-6">
                  {t("searching")}
                </p>
              )}

              {!loading && query && filteredFoods.length === 0 && (
                <p className="text-muted-foreground text-center text-sm py-6">
                  {locale === "mn"
                    ? "Бүтээгдэхүүн олдсонгүй"
                    : t("no_food_found", "No products found")}
                </p>
              )}

              {filteredFoods.map((item, index) => (
                <motion.div
                  key={item.id || index}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Link
                    href={`/${locale}/food/${item.id || ""}`}
                    onClick={() => setOpen(false)}
                    className="
                      flex items-center gap-4 p-3
                      rounded-xl
                      hover:bg-muted/50
                      transition
                    "
                  >
                    <img
                      src={item.image}
                      alt={item.foodName}
                      className="w-[52px] h-[52px] rounded-lg object-cover"
                    />
                    <div className="min-w-0">
                      <h3 className="font-medium text-sm truncate">
                        {highlightMatch(item.foodName, query)}
                      </h3>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        {item.price?.toLocaleString()}₮
                      </p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
  );
};
