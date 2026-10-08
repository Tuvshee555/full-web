/* eslint-disable @next/next/no-img-element */
// components/FoodList.tsx
"use client";
import React, { useEffect, useRef, useState } from "react";

type Food = {
  id: string;
  foodName: string;
  price: number;
  description?: string;
  image?: string;
};

export const FoodList: React.FC<{
  foods: Food[];
  highlightedIds?: string[]; // from AI
}> = ({ foods, highlightedIds = [] }) => {
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const [activeId, setActiveId] = useState<string | null>(null);

  // Scroll to first highlighted id when it changes
  useEffect(() => {
    if (!highlightedIds || highlightedIds.length === 0) return;
    const idToScroll = highlightedIds[0];
    const el = refs.current[idToScroll];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setActiveId(idToScroll);
      // remove highlight after 4s
      const t = setTimeout(() => setActiveId(null), 4000);
      return () => clearTimeout(t);
    }
  }, [highlightedIds]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {foods.map((f) => {
        const isActive = activeId === f.id || highlightedIds.includes(f.id);
        return (
          <div
            key={f.id}
            ref={(el) => {
              refs.current[f.id] = el;
            }}
            className={`p-3 rounded-xl border transition-shadow relative ${
              isActive
                ? "ring-2 ring-primary/60 bg-primary/5 shadow-lg"
                : "bg-white"
            }`}
          >
            <div className="flex items-start gap-3">
              <img
                src={f.image ?? "/placeholder.png"}
                alt={f.foodName}
                className="w-20 h-20 object-cover rounded-md flex-shrink-0"
              />
              <div>
                <div className="font-semibold">{f.foodName}</div>
                <div className="text-xs text-muted-foreground line-clamp-2 max-w-[240px]">
                  {f.description ?? "No description"}
                </div>
                <div className="mt-2 font-medium">${f.price.toFixed(2)}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
