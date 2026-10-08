/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { buildMediaMap } from "./mediaMap";

export type TabKey = "featured" | "new" | "bestseller";

const SCROLL_INTERVAL_MS = 6000;

export function useAutoScrollProducts(foodData: any[]) {
  const [activeTab, setActiveTab] = useState<TabKey>("featured");

  const products = useMemo(
    () => [...foodData].sort(() => Math.random() - 0.5),
    [foodData]
  );

  const mediaMapRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const { map, revoke } = buildMediaMap(products);
    mediaMapRef.current = map;
    return revoke;
  }, [products]);

  const getMediaUrl = (item: any) =>
    mediaMapRef.current.get(item.id ?? item.foodId ?? "");

  const filtered = useMemo(() => {
    if (!products.length) return [];

    if (activeTab === "featured") {
      const featured = products.filter((p) => p.isFeatured);
      return featured.length
        ? featured
        : [...products].sort(
            (a, b) => (b.salesCount || 0) - (a.salesCount || 0)
          );
    }

    if (activeTab === "new") {
      return [...products].sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      );
    }

    return [...products].sort(
      (a, b) => (b.salesCount || 0) - (a.salesCount || 0)
    );
  }, [products, activeTab]);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const intervalRef = useRef<number | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const [itemWidth, setItemWidth] = useState(260);

  const stopAutoScroll = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startAutoScroll = useCallback(() => {
    stopAutoScroll();
    intervalRef.current = window.setInterval(() => {
      const c = scrollRef.current;
      if (!c) return;

      const max = c.scrollWidth - c.clientWidth;
      c.scrollLeft >= max - 2
        ? c.scrollTo({ left: 0, behavior: "smooth" })
        : c.scrollBy({ left: itemWidth, behavior: "smooth" });
    }, SCROLL_INTERVAL_MS);
  }, [itemWidth, stopAutoScroll]);

  useEffect(() => {
    const c = scrollRef.current;
    if (!c) return;

    if (c.scrollWidth <= c.clientWidth) {
      stopAutoScroll();
      return;
    }

    startAutoScroll();
    return stopAutoScroll;
  }, [filtered.length, itemWidth, startAutoScroll, stopAutoScroll]);

  useEffect(() => {
    const c = scrollRef.current;
    if (!c) return;

    const enter = () => stopAutoScroll();
    const leave = () => startAutoScroll();

    c.addEventListener("mouseenter", enter);
    c.addEventListener("mouseleave", leave);

    return () => {
      c.removeEventListener("mouseenter", enter);
      c.removeEventListener("mouseleave", leave);
    };
  }, [startAutoScroll, stopAutoScroll]);

  useEffect(() => {
    const c = scrollRef.current;
    if (!c) return;
    c.scrollTo({ left: 0, behavior: "smooth" });
  }, [activeTab]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const measure = () => {
      const el = container.querySelector<HTMLElement>("[data-auto-item]");
      if (!el) return;
      const gap =
        Number(getComputedStyle(container).gap?.replace("px", "") || 0) || 0;
      setItemWidth(el.offsetWidth + gap);
    };

    measure();

    if (typeof ResizeObserver !== "undefined") {
      observerRef.current = new ResizeObserver(measure);
      observerRef.current.observe(container);
      const first = container.querySelector("[data-auto-item]");
      if (first) observerRef.current.observe(first);
    } else {
      window.addEventListener("resize", measure);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      } else {
        window.removeEventListener("resize", measure);
      }
    };
  }, [filtered.length]);

  return {
    activeTab,
    setActiveTab,
    filtered,
    getMediaUrl,
    scrollRef,
  };
}
