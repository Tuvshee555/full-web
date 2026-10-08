/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from "react";
import type { FoodType } from "@/type/type";
import type { Media } from "../FoodMediaLightbox";
import { getMediaUrl } from "./getMediaUrl";

export const useFoodMedia = (food: FoodType) => {
  const mediaList = useMemo<Media[]>(() => {
    const list: Media[] = [];

    if (food.image) {
      list.push({ type: "image", src: getMediaUrl(food.image) });
    }

    if (Array.isArray(food.extraImages)) {
      food.extraImages.forEach((img) =>
        list.push({ type: "image", src: getMediaUrl(img) })
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

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [slideWidth, setSlideWidth] = useState(0);

  useEffect(() => {
    const update = () => {
      setSlideWidth(containerRef.current?.offsetWidth ?? 0);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    setIsTouch(
      typeof window !== "undefined" &&
        ("ontouchstart" in window || navigator.maxTouchPoints > 0)
    );
  }, []);

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

  const onDragEnd = (
    _: any,
    info: { offset: { x: number }; velocity: { x: number } }
  ) => {
    if (!slideWidth) return;

    let next = activeIndex - Math.round(info.offset.x / slideWidth);

    if (Math.abs(info.velocity.x) > 600) {
      next = activeIndex - Math.sign(info.velocity.x);
    }

    next = Math.max(0, Math.min(mediaList.length - 1, next));
    setActiveIndex(next);
  };

  return {
    mediaList,
    activeIndex,
    setActiveIndex,
    lightboxOpen,
    setLightboxOpen,
    containerRef,
    slideWidth,
    isTouch,
    onDragEnd,
  };
};
