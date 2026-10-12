export type StockLevel = "untracked" | "soldout" | "low" | "available";
export type StockSize = { stock?: number | null; stockLevel?: StockLevel };
export function stockLevel(size: StockSize, threshold?: number): StockLevel;
export function productStockLevel(sizes?: StockSize[], threshold?: number): StockLevel;
export function stockLabel(level: StockLevel, locale?: string): string;
