"use client";

import { Fragment, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import Link from "next/link";
import MagneticButton from "@/components/motion/MagneticButton";

const slides = [
  {
    // warm red → orange (fresh & hot)
    bgClass: "bg-gradient-to-br from-[#3a0d05] via-[#a52c12] to-[#e8691d]",
    glow: "radial-gradient(circle at 28% 38%, rgba(255,186,92,0.30), transparent 60%)",
    subtitle: {
      mn: "ШИНЭХЭН & ХАЛУУН",
      en: "FRESH & HOT",
      ko: "신선하고 뜨겁게",
    },
    title: {
      mn: "Дуртай хоолоо гэрээрээ",
      en: "Your favorites, delivered hot",
      ko: "좋아하는 음식을 집까지",
    },
  },
  {
    // charcoal → amber (fast delivery)
    bgClass: "bg-gradient-to-r from-[#1c1206] via-[#804114] to-[#e79127]",
    glow: "radial-gradient(circle at 70% 45%, rgba(255,205,110,0.28), transparent 60%)",
    subtitle: {
      mn: "ШУУРХАЙ ХҮРГЭЛТ",
      en: "FAST DELIVERY",
      ko: "빠른 배송",
    },
    title: {
      mn: "Захиалаад, хурдхан хүлээж ав",
      en: "Order now, get it fast",
      ko: "지금 주문하고 빠르게 받기",
    },
  },
  {
    // maroon → coral (today's favorites)
    bgClass: "bg-gradient-to-tr from-[#2a0a0f] via-[#93283a] to-[#e86f4c]",
    glow: "radial-gradient(circle at 35% 55%, rgba(255,160,120,0.30), transparent 60%)",
    subtitle: {
      mn: "ӨНӨӨДРИЙН ОНЦЛОХ",
      en: "TODAY'S PICKS",
      ko: "오늘의 추천",
    },
    title: {
      mn: "Хамгийн эрэлттэй амтат хоол",
      en: "Today's most-loved dishes",
      ko: "가장 사랑받는 요리",
    },
  },
];

// Reveal per WORD (each word's letters animate together but never break
// mid-word), so long Cyrillic titles wrap cleanly instead of stacking
// one letter per line on narrow screens.
function CharReveal({ text, delay = 0 }: { text: string; delay?: number }) {
  const words = text.split(" ");
  let charIndex = 0;

  return (
    <span className="inline">
      {words.map((word, wi) => {
        const chars = word.split("");
        const wordEl = (
          <span className="inline-flex overflow-hidden whitespace-nowrap align-bottom">
            {chars.map((char, ci) => {
              const idx = charIndex++;
              return (
                <span key={ci} className="overflow-hidden inline-block">
                  <motion.span
                    className="inline-block"
                    initial={{ y: "110%", opacity: 0 }}
                    animate={{ y: "0%", opacity: 1 }}
                    transition={{
                      duration: 0.5,
                      delay: delay + idx * 0.03,
                      ease: [0.25, 0.46, 0.45, 0.94] as any,
                    }}
                  >
                    {char}
                  </motion.span>
                </span>
              );
            })}
          </span>
        );

        return (
          <Fragment key={wi}>
            {wordEl}
            {wi < words.length - 1 ? " " : ""}
          </Fragment>
        );
      })}
    </span>
  );
}

export function HeroCarousel() {
  const { t, locale } = useI18n();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => setActive((p) => (p + 1) % slides.length), []);
  const prev = useCallback(() => setActive((p) => (p - 1 + slides.length) % slides.length), []);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [paused, next]);

  return (
    <div
      className="relative w-full h-[70vh] min-h-[500px] max-h-[700px] overflow-hidden bg-black"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          className={`absolute inset-0 ${slides[active].bgClass}`}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] as any }}
        >
          {/* Soft warm spotlight for depth */}
          <div
            className="absolute inset-0"
            style={{ background: slides[active].glow }}
          />

          {/* Legibility overlay behind the text */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />

          {/* Text overlay */}
          <div className="absolute left-8 md:left-16 bottom-20 max-w-[85%] md:max-w-lg">
            <motion.p
              className="text-white/70 text-xs md:text-sm uppercase tracking-[0.2em] mb-3 font-semibold"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {slides[active].subtitle[locale as "mn" | "en" | "ko"] ??
                slides[active].subtitle.mn}
            </motion.p>

            <h2 className="text-white text-3xl sm:text-4xl md:text-5xl font-black leading-tight mb-6 tracking-tight">
              <CharReveal
                text={
                  slides[active].title[locale as "mn" | "en" | "ko"] ??
                  slides[active].title.mn
                }
                delay={0.15}
              />
            </h2>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.45 }}
            >
              <MagneticButton strength={0.3}>
                <Link
                  href={`/${locale}/category/all`}
                  className="inline-flex items-center px-8 py-3 rounded-full bg-white text-black text-sm font-semibold
                    hover:bg-white/90 transition-all duration-300 tracking-wide shadow-lg"
                >
                  {t("shop_now")}
                </Link>
              </MagneticButton>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Prev / Next */}
      <button
        onClick={prev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full
          bg-background/20 backdrop-blur-sm border border-white/20 hover:bg-background/40
          flex items-center justify-center transition-colors"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-5 h-5 text-white" />
      </button>
      <button
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full
          bg-background/20 backdrop-blur-sm border border-white/20 hover:bg-background/40
          flex items-center justify-center transition-colors"
        aria-label="Next slide"
      >
        <ChevronRight className="w-5 h-5 text-white" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`h-1.5 rounded-full transition-all duration-300
              ${i === active ? "w-8 bg-white" : "w-2 bg-white/40 hover:bg-white/60"}`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
