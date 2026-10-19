/**
 * Normalize a `sizes` payload into `[{ label, stock, price? }]`.
 *
 * Accepts either the legacy shape (array of label strings) or the richer
 * `{ label, stock }` shape, so older admin clients keep working. `stock` is
 * null (= unlimited / untracked) unless a non-negative integer is provided.
 */
export function normalizeSizeInput(sizes) {
  if (!Array.isArray(sizes)) return [];

  return sizes
    .map((s) => {
      if (typeof s === "string") {
        return { label: s.trim(), stock: null };
      }

      const label = typeof s?.label === "string" ? s.label.trim() : "";

      let stock = null;
      if (s?.stock !== null && s?.stock !== undefined && s?.stock !== "") {
        const n = Number(s.stock);
        stock = Number.isSafeInteger(n) && n >= 0 ? n : null;
      }

      // price: a size's own price. Left out when the client did not send it (the
      // caller then keeps the saved price); null clears it back to the product price.
      let price;
      if (s && Object.prototype.hasOwnProperty.call(s, "price")) {
        const p = Number(s.price);
        price = s.price === null || s.price === "" || !Number.isFinite(p) || p <= 0 ? null : Math.round(p * 100) / 100;
      }

      return price === undefined ? { label, stock } : { label, stock, price };
    })
    .filter((s) => s.label);
}
