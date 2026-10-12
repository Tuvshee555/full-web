"use client";

import { stockLabel, type StockLevel } from "../../../server/utils/stockLevel.js";

export function StockBadge({ level, locale }: { level?: StockLevel; locale: string }) {
  if (level !== "low" && level !== "soldout") return null;
  return <span className="inline-block border border-terracotta/30 bg-paper px-2 py-1 text-xs text-terracotta">{stockLabel(level, locale)}</span>;
}
