/** Reject malformed money/inventory before Prisma can persist invalid values. */
const TEXT_LIMITS = { volume: 60, howToUse: 4000, ingredientList: 4000, safetyNotes: 2000, storage: 1000, usageFrequency: 300 };
/** Facts the owner can mark as checked against the real product; the assistant quotes only verified ones. */
export const PRODUCT_FACT_KEYS = ["description", "ingredients", "volume", "usage", "frequency", "storage", "safety", "claims", "photos", "price", "stock"];

/** The product FAQ as stored: up to 30 question/answer pairs, each a short plain string. */
export function normalizeProductFaq(value) {
  if (value === undefined) return undefined;
  if (value === null) return [];
  if (!Array.isArray(value) || value.length > 30) return null;
  const items = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || typeof item.q !== "string" || typeof item.a !== "string") return null;
    const q = item.q.trim(); const a = item.a.trim();
    if (!q && !a) continue;
    if (!q || !a || q.length > 300 || a.length > 2000) return null;
    items.push({ q, a });
  }
  return items;
}

export function validateProductInput(body, creating = false) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "Invalid product data";
  if (creating || body.productName !== undefined) {
    if (typeof body.productName !== "string" || !body.productName.trim() || body.productName.trim().length > 200) return "Product name must be 1-200 characters";
  }
  for (const key of ["image", "video", "ingredients", "address"]) {
    if (body[key] !== undefined && typeof body[key] !== "string") return `Invalid ${key}`;
  }
  for (const [key, limit] of Object.entries(TEXT_LIMITS)) {
    if (body[key] !== undefined && body[key] !== null && (typeof body[key] !== "string" || body[key].length > limit)) return `Invalid ${key}`;
  }
  if (body.faq !== undefined && normalizeProductFaq(body.faq) === null) return "Invalid faq";
  if (body.verifiedFacts !== undefined && (!body.verifiedFacts || typeof body.verifiedFacts !== "object" || Array.isArray(body.verifiedFacts)
    || Object.entries(body.verifiedFacts).some(([key, value]) => !PRODUCT_FACT_KEYS.includes(key) || typeof value !== "boolean"))) return "Invalid verifiedFacts";
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

/** The knowledge fields of a create/update body, trimmed; undefined means "leave unchanged". */
export function knowledgeFields(body) {
  const data = {};
  for (const key of Object.keys(TEXT_LIMITS)) {
    if (body[key] === undefined) continue;
    data[key] = typeof body[key] === "string" && body[key].trim() ? body[key].trim() : null;
  }
  const faq = normalizeProductFaq(body.faq);
  if (faq !== undefined && faq !== null) data.faq = faq;
  return data;
}

/**
 * The next verification map: a key ticked now keeps its earlier date or gets today's; an unticked
 * key is removed. Keys the request does not mention are left as they were. A fact whose text was
 * cleared or changed in the same request loses its verification (the owner checked different text).
 */
export function nextVerifiedFacts(current, body, changedTextKeys = []) {
  const existing = current && typeof current === "object" && !Array.isArray(current) ? { ...current } : {};
  const map = { usage: "howToUse", ingredients: "ingredientList", safety: "safetyNotes", frequency: "usageFrequency", volume: "volume", storage: "storage", description: "ingredients", claims: "ingredients" };
  for (const [fact, field] of Object.entries(map)) if (changedTextKeys.includes(field)) delete existing[fact];
  const requested = body?.verifiedFacts;
  if (requested && typeof requested === "object" && !Array.isArray(requested)) {
    for (const [key, value] of Object.entries(requested)) {
      if (!PRODUCT_FACT_KEYS.includes(key)) continue;
      if (value === true) existing[key] = existing[key] || new Date().toISOString();
      else delete existing[key];
    }
  }
  return existing;
}
