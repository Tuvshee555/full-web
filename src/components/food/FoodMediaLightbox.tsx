"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

export type Media = {
  type: "image" | "video";
  src: string;
};

export function FoodMediaLightbox({
  open,
  onClose,
  media,
  index,
  setIndex,
}: {
  open: boolean;
  onClose: () => void;
  media: Media[];
  index: number;
  setIndex: (i: number) => void;
}) {
  const [isZoomed, setIsZoomed] = useState(false);

  // reset zoom when closing or switching image
  useEffect(() => {
    if (!open) setIsZoomed(false);
  }, [open, index]);

  // keyboard controls
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();

      if (!isZoomed) {
        if (e.key === "ArrowRight" && index < media.length - 1) {
          setIndex(index + 1);
        }
        if (e.key === "ArrowLeft" && index > 0) {
          setIndex(index - 1);
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, index, media.length, isZoomed, onClose, setIndex]);

  if (!open) return null;

  const current = media[index];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="relative max-w-full max-h-full"
          onClick={(e) => e.stopPropagation()}
          drag={isZoomed ? true : "x"}
          dragConstraints={
            isZoomed
              ? { top: -400, bottom: 400, left: -400, right: 400 }
              : { left: 0, right: 0 }
          }
          onDragEnd={(_, info) => {
            if (isZoomed) return;

            if (info.offset.x < -80 && index < media.length - 1) {
              setIndex(index + 1);
            }
            if (info.offset.x > 80 && index > 0) {
              setIndex(index - 1);
            }
          }}
        >
          {current.type === "image" ? (
            <motion.img
              src={current.src}
              onDoubleClick={() => setIsZoomed((z) => !z)}
              className="max-h-screen max-w-screen object-contain"
              animate={{
                scale: isZoomed ? 2 : 1,
                cursor: isZoomed ? "zoom-out" : "zoom-in",
              }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
              draggable={false}
            />
          ) : (
            <video
              src={current.src}
              controls
              autoPlay
              className="max-h-screen max-w-screen object-contain"
            />
          )}

          {/* CLOSE BUTTON */}
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 text-white text-2xl leading-none"
          >
            ✕
          </button>

          {/* COUNTER */}
          {media.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/80">
              {index + 1} / {media.length}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
