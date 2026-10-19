// Keep previously shipped clients working while application code uses products.
// Legacy names are confined to this HTTP boundary and saved-cart normalization.
const legacyFields = new Map([
  ["foodId", "productId"],
  ["foodName", "productName"],
  ["food", "product"],
  ["foods", "products"],
  ["foodCount", "productCount"],
  ["foodOrderItems", "orderItems"],
]);
const previousFields = new Map(Array.from(legacyFields, ([oldKey, key]) => [key, oldKey]));

function canonicalInput(value) {
  if (Array.isArray(value)) return value.map(canonicalInput);
  if (!value || typeof value !== "object") return value;
  const result = Object.fromEntries(Object.entries(value).map(([key, item]) => [
    legacyFields.get(key) ?? key, canonicalInput(item),
  ]));
  // Explicit product fields take precedence when a client sends both versions.
  for (const key of previousFields.keys()) {
    if (Object.hasOwn(value, key)) result[key] = canonicalInput(value[key]);
  }
  return result;
}

function withPreviousFields(value) {
  if (Array.isArray(value)) return value.map(withPreviousFields);
  if (!value || typeof value !== "object" || value instanceof Date) return value;
  return Object.fromEntries(Object.entries(value).flatMap(([key, item]) => {
    const normalized = withPreviousFields(item);
    const previous = previousFields.get(key);
    return previous ? [[key, normalized], [previous, normalized]] : [[key, normalized]];
  }));
}

export function catalogCompatibility(req, res, next) {
  const originalUrl = req.url;
  req.url = req.url
    .replace(/^\/food(?=\/|\?|$)/i, "/products")
    .replace(/^(\/category\/[^/?]+)\/foods-tree\/?(?=\?|$)/i, "$1/products-tree")
    .replace(/^\/review\/food(?=\/|\?|$)/i, "/review/products");

  if (!/^\/(?:products|order|category|items|review)(?:\/|\?|$)/i.test(req.url)) return next();
  const originalBody = req.body;
  req.body = canonicalInput(originalBody);
  // Shared order/category URLs existed before the catalog rename. Add aliases
  // there as well so cached pages can still read their purchase history.
  const sharedRoute = /^\/(?:order|category|items|review)(?:\/|\?|$)/i.test(req.url);
  const previousBody = originalBody && JSON.stringify(originalBody) !== JSON.stringify(req.body);
  if (originalUrl !== req.url || sharedRoute || previousBody) {
    const json = res.json;
    res.json = function (value) { return json.call(this, withPreviousFields(value)); };
  }
  next();
}
