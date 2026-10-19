/** Reject malformed money/inventory before Prisma can persist invalid values. */
export function validateProductInput(body, creating = false) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "Invalid product data";
  if (creating || body.productName !== undefined) {
    if (typeof body.productName !== "string" || !body.productName.trim() || body.productName.trim().length > 200) return "Product name must be 1-200 characters";
  }
  for (const key of ["image", "video", "ingredients", "address"]) {
    if (body[key] !== undefined && typeof body[key] !== "string") return `Invalid ${key}`;
  }
  if (body.categoryId != null && typeof body.categoryId !== "string") return "Invalid category";
  if (body.isFeatured !== undefined && typeof body.isFeatured !== "boolean") return "Invalid featured flag";
  if (body.extraImages !== undefined && (!Array.isArray(body.extraImages) || body.extraImages.length > 30 || body.extraImages.some((image) => typeof image !== "string"))) return "Invalid product images";
  for (const key of ["price", "oldPrice", "discount", "salesCount"]) {
    const value = body[key];
    if (value == null || value === "") continue;
    const numeric = typeof value === "number" || typeof value === "string" && value.trim() !== "";
    const number = Number(value);
    const maximum = key === "discount" ? 100 : key === "salesCount" ? 2_147_483_647 : 1_000_000_000;
    if (!numeric || !Number.isFinite(number) || number < 0 || number > maximum || (["discount", "salesCount"].includes(key) && !Number.isInteger(number))) return `Invalid ${key}`;
  }
  if (body.sizes !== undefined) {
    if (!Array.isArray(body.sizes) || body.sizes.length > 100) return "Product options must be an array of up to 100 items";
    const labels = new Set();
    for (const size of body.sizes) {
      const label = typeof size === "string" ? size.trim() : typeof size?.label === "string" ? size.label.trim() : "";
      if (!label || label.length > 60 || labels.has(label.toLocaleLowerCase())) return "Product option names must be unique and 1-60 characters";
      labels.add(label.toLocaleLowerCase());
      if (typeof size === "object") for (const key of ["stock", "expectedStock"]) {
        const value = size[key];
        if (value == null || key === "stock" && value === "") continue;
        const stock = Number(value);
        if (!["number", "string"].includes(typeof value) || String(value).trim() === "" || !Number.isSafeInteger(stock) || stock < 0 || stock > 2_147_483_647) return "Stock must be a non-negative whole number or null";
      }
      // A size's own price: null/"" = sells at the product price.
      if (typeof size === "object" && size.price != null && size.price !== "") {
        const price = Number(size.price);
        if (!["number", "string"].includes(typeof size.price) || String(size.price).trim() === "" || !Number.isFinite(price) || price <= 0 || price > 1_000_000_000) return "Invalid option price";
      }
    }
  }
  return null;
}
