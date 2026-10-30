export type InventoryOption = { label: string; stock: string };
type InventoryUpdate = { label: string; stock?: number | null; expectedStock?: number | null };

/** Keep the exact stock when opening a product; an empty value means untracked. */
export function inventoryOptions(sizes: unknown): InventoryOption[] {
  if (!Array.isArray(sizes)) return [];
  return sizes.flatMap((size) => {
    if (typeof size === "string") return size.trim() ? [{ label: size.trim(), stock: "" }] : [];
    if (!size || typeof size !== "object" || typeof size.label !== "string" || !size.label.trim()) return [];
    return [{ label: size.label.trim(), stock: size.stock == null ? "" : String(size.stock) }];
  });
}

export function validInventory(options: InventoryOption[]): boolean {
  return options.every(({ label, stock }) => label.trim() && (stock === "" || (/^\d+$/.test(stock) && Number.isSafeInteger(Number(stock)) && Number(stock) <= 2_147_483_647)));
}

/**
 * What the owner needs to know about a product's stock, option by option.
 * "partial" = some options are sold out while others still sell.
 */
export type StockState = "untracked" | "ok" | "low" | "partial" | "soldout";
export type StockSummary = { state: StockState; total: number; tracked: number; soldOut: string[]; low: { label: string; stock: number }[] };

export function stockSummary(sizes: unknown): StockSummary {
  const list = (Array.isArray(sizes) ? sizes : []).filter(
    (s): s is { label: string; stock?: number | null; stockLevel?: string } => Boolean(s) && typeof s === "object" && typeof (s as { label?: unknown }).label === "string"
  );
  const tracked = list.filter((s) => typeof s.stock === "number");
  if (!tracked.length) return { state: "untracked", total: 0, tracked: 0, soldOut: [], low: [] };
  const soldOut = tracked.filter((s) => (s.stock ?? 0) <= 0).map((s) => s.label);
  const low = tracked
    .filter((s) => (s.stock ?? 0) > 0 && (s.stockLevel === "low" || (s.stockLevel === undefined && (s.stock ?? 0) <= 5)))
    .map((s) => ({ label: s.label, stock: s.stock as number }));
  const total = tracked.reduce((n, s) => n + Math.max(0, s.stock ?? 0), 0);
  // An untracked option can always be sold, so the product is only sold out when every option is.
  const state: StockState = soldOut.length === list.length ? "soldout" : soldOut.length ? "partial" : low.length ? "low" : "ok";
  return { state, total, tracked: tracked.length, soldOut, low };
}

export const needsRestock = (summary: StockSummary) => summary.state === "low" || summary.state === "partial" || summary.state === "soldout";

export function inventoryPayload(options: InventoryOption[], originalSizes?: unknown): InventoryUpdate[] {
  const original = new Map(inventoryOptions(originalSizes).map(({ label, stock }) => [label, stock]));
  return options.map(({ label, stock }) => {
    const prior = original.get(label);
    // Omit untouched counts: a customer may have reserved stock while this sheet was open.
    if (original.has(label) && prior === stock) return { label: label.trim() };
    return {
      label: label.trim(), stock: stock === "" ? null : Number(stock),
      ...(original.has(label) ? { expectedStock: prior === "" ? null : Number(prior) } : {}),
    };
  });
}
