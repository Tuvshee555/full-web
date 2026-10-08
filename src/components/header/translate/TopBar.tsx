"use client";

import { motion } from "framer-motion";
import TranslateButton from "../translate/TranslateButton";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { useTranslations } from "@/components/i18n/ClientI18nProvider";
import { Facebook, Instagram, Youtube } from "lucide-react";

export default function TopBar() {
  const t = useTranslations();

  const announcement = `🚚 ${t("free_shipping_announcement")}  ·  ${t("new_arrivals_announcement")}  ·  🚚 ${t("free_shipping_announcement")}  ·  ${t("new_arrivals_announcement")}`;

  return (
    <div className="w-full bg-primary text-primary-foreground text-[12px] overflow-hidden">
      <div className="max-w-7xl mx-auto relative flex items-center h-9">
        {/* Marquee track */}
        <div className="flex-1 overflow-hidden relative">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 h-full w-10 bg-gradient-to-r from-primary to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-primary to-transparent z-10 pointer-events-none" />

          <motion.div
            className="flex whitespace-nowrap"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          >
            <span className="font-medium tracking-wider uppercase text-primary-foreground/80 px-4">
              {announcement}&nbsp;&nbsp;&nbsp;&nbsp;{announcement}
            </span>
          </motion.div>
        </div>

        {/* Controls — always visible on right */}
        <div className="flex items-center gap-3 px-4 shrink-0">
          <a
            href="https://facebook.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className="text-primary-foreground/85 hover:text-primary-foreground transition-colors"
          >
            <Facebook className="h-3.5 w-3.5" />
          </a>
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="text-primary-foreground/85 hover:text-primary-foreground transition-colors"
          >
            <Instagram className="h-3.5 w-3.5" />
          </a>
          <a
            href="https://youtube.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="YouTube"
            className="text-primary-foreground/85 hover:text-primary-foreground transition-colors"
          >
            <Youtube className="h-3.5 w-3.5" />
          </a>
          <TranslateButton />
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
