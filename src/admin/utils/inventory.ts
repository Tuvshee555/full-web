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
