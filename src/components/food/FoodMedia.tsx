/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { FoodType } from "@/type/type";
import { FoodMediaLightbox } from "./FoodMediaLightbox";
import type { Media } from "./FoodMediaLightbox";

const getMediaUrl = (media?: string | File): string => {
  if (!media) return "/placeholder.png";
  return typeof media === "string" ? media : URL.createObjectURL(media);
};

export const FoodMedia = ({ food }: { food: FoodType }) => {
  const mediaList = useMemo<Media[]>(() => {
    const list: Media[] = [];

    if (food.image) {
      list.push({ type: "image", src: getMediaUrl(food.image) });
    }

    if (Array.isArray(food.extraImages)) {
      food.extraImages.forEach((img) =>
        list.push({ type: "image", src: getMediaUrl(img) }),
      );
    }

    if (food.video) {
      list.push({
        type: "video",
        src:
          typeof food.video === "string"
            ? food.video
            : URL.createObjectURL(food.video),
      });
    }

    return list.length ? list : [{ type: "image", src: "/placeholder.png" }];
  }, [food]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => setActiveIndex(0), [mediaList.length]);

  /* refs */
  const desktopRef = useRef<HTMLDivElement | null>(null);
  const mobileRef = useRef<HTMLDivElement | null>(null);
  const [slideWidth, setSlideWidth] = useState(0);

  /* measure width */
  useEffect(() => {
    const update = () => {
      const el =
        window.innerWidth >= 1024 ? desktopRef.current : mobileRef.current;
      setSlideWidth(el?.offsetWidth ?? 0);
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  /* cleanup blobs */
  useEffect(() => {
    return () => {
      mediaList.forEach((m) => {
        if (m.src.startsWith("blob:")) {
          try {
            URL.revokeObjectURL(m.src);
          } catch {}
        }
      });
    };
  }, [mediaList]);

  /* unified drag logic (desktop + mobile) */
  const onDragEnd = (
    _: any,
    info: { offset: { x: number }; velocity: { x: number } },
  ) => {
    if (!slideWidth) return;

    let next = activeIndex - Math.round(info.offset.x / slideWidth);

    if (Math.abs(info.velocity.x) > 600) {
      next = activeIndex - Math.sign(info.velocity.x);
    }

    next = Math.max(0, Math.min(mediaList.length - 1, next));
    setActiveIndex(next);
  };

  /* arrows */
  const prev = () => setActiveIndex((i) => Math.max(0, i - 1));

  const next = () =>
    setActiveIndex((i) => Math.min(mediaList.length - 1, i + 1));

  return (
    <div className="w-full">
      {/* ================= DESKTOP ================= */}
      <div className="hidden lg:flex gap-4">
        {mediaList.length > 1 && (
          <div className="flex flex-col gap-3">
            {mediaList.map((m, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className={`relative w-14 h-14 rounded-md overflow-hidden border ${
                  i === activeIndex ? "border-primary" : "border-border"
                }`}
              >
                {m.type === "image" ? (
                  <img src={m.src} className="w-full h-full object-cover" />
                ) : (
                  <>
                    <video src={m.src} className="w-full h-full object-cover" />
                    <span className="absolute inset-0 grid place-items-center bg-black/40 text-white text-xs">
                      ▶
                    </span>
                  </>
                )}
              </button>
            ))}
          </div>
        )}

        <div
          ref={desktopRef}
          className="relative flex-1 h-[460px] bg-muted overflow-hidden border border-border rounded-xl"
        >
          {/* arrows */}
          {mediaList.length > 1 && (
            <>
              <button
                onClick={prev}
                disabled={activeIndex === 0}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full bg-black/40 text-white disabled:opacity-30 hover:bg-black/60"
              >
                ‹
              </button>
              <button
                onClick={next}
                disabled={activeIndex === mediaList.length - 1}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full bg-black/40 text-white disabled:opacity-30 hover:bg-black/60"
              >
                ›
              </button>
            </>
          )}

          <motion.div
            className="flex h-full cursor-grab active:cursor-grabbing"
            drag="x"
            dragConstraints={{
              left: -(slideWidth * (mediaList.length - 1)),
              right: 0,
            }}
            dragElastic={0.2}
            onDragEnd={onDragEnd}
            animate={{ x: -activeIndex * slideWidth }}
            transition={{ type: "spring", stiffness: 300, damping: 35 }}
          >
            {mediaList.map((m) => (
              <div
                key={m.src}
                className="flex-shrink-0 w-full h-full relative"
                style={{ minWidth: slideWidth || "100%" }}
              >
                <AnimatePresence mode="wait">
                  {m.type === "image" ? (
                    <motion.img
                      key={m.src}
                      src={m.src}
                      onClick={() => setLightboxOpen(true)}
                      className="absolute inset-0 w-full h-full object-cover cursor-zoom-in"
                      initial={{ opacity: 0.6 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      draggable={false}
                    />
                  ) : (
                    <motion.video
                      key={m.src}
                      src={m.src}
                      controls
                      playsInline
                      onClick={() => setLightboxOpen(true)}
                      className="absolute inset-0 w-full h-full object-cover cursor-zoom-in"
                      initial={{ opacity: 0.6 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18 }}
                    />
                  )}
                </AnimatePresence>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ================= MOBILE ================= */}
      <div
        ref={mobileRef}
        className="relative w-full h-[320px] sm:h-[380px] bg-muted overflow-hidden border border-border lg:hidden"
      >
        <motion.div
          className="flex h-full"
          drag="x"
          dragConstraints={{
            left: -(slideWidth * (mediaList.length - 1)),
            right: 0,
          }}
          dragElastic={0.2}
          onDragEnd={onDragEnd}
          animate={{ x: -activeIndex * slideWidth }}
          transition={{ type: "spring", stiffness: 300, damping: 35 }}
          style={{ touchAction: "pan-y" }}
        >
          {mediaList.map((m) => (
            <div
              key={m.src}
              className="flex-shrink-0 w-full h-full relative"
              style={{ minWidth: slideWidth || "100%" }}
            >
              {m.type === "image" ? (
                <img
                  src={m.src}
                  onClick={() => setLightboxOpen(true)}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <video
                  src={m.src}
                  controls
                  playsInline
                  onClick={() => setLightboxOpen(true)}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
            </div>
          ))}
        </motion.div>
      </div>

      {/* DOTS
      {mediaList.length > 1 && (
        <div className="mt-3 flex justify-center gap-1.5 lg:hidden">
          {mediaList.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`w-1.5 h-1.5 rounded-full ${
                i === activeIndex ? "bg-primary" : "bg-muted-foreground/40"
              }`}
            />
          ))}
        </div>
      )} */}
      {/* MOBILE THUMBNAILS */}
      {mediaList.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto px-1 lg:hidden">
          {mediaList.map((m, i) => (
            <button
              key={m.src}
              onClick={() => setActiveIndex(i)}
              className={`relative flex-shrink-0 w-14 h-14 rounded-md overflow-hidden border ${
                i === activeIndex ? "border-primary" : "border-border"
              }`}
            >
              {m.type === "image" ? (
                <img src={m.src} className="w-full h-full object-cover" />
              ) : (
                <>
                  <video src={m.src} className="w-full h-full object-cover" />
                  <span className="absolute inset-0 grid place-items-center bg-black/40 text-white text-xs">
                    ▶
                  </span>
                </>
              )}
            </button>
          ))}
        </div>
      )}

      {/* LIGHTBOX */}
      <FoodMediaLightbox
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        media={mediaList}
        index={activeIndex}
        setIndex={setActiveIndex}
      />
    </div>
  );
};
