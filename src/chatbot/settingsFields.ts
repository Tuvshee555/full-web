// The copied admin settings route keeps a closed field allow-list. Fact-bearing
// prices and claims belong to catalogue/config, never editable greeting prose.
export function parseSettingsFields(fields: unknown) {
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) throw new Error("fields object is required");
  const input = fields as Record<string, unknown>;
  const data: Record<string, string | number | boolean> = {};
  for (const key of ["enabled", "metaOutbound", "showExactStock"]) if (key in input) {
    if (typeof input[key] !== "boolean") throw new Error("invalid setting");
    data[key] = input[key];
  }
  if ("lowStockThreshold" in input) {
    const value = input.lowStockThreshold;
    if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 1000) throw new Error("invalid threshold");
    data.lowStockThreshold = value;
  }
  for (const key of ["greetingMn", "greetingEn", "handoffMn", "handoffEn", "extraKnowledgeMn", "extraKnowledgeEn"]) if (key in input) {
    const text = input[key];
    if (typeof text !== "string" || text.length > (key.startsWith("extra") ? 8000 : 1000) || (!key.startsWith("extra") && !text.trim()) || /₮|\bMNT\b|\d+\s*%|100%|regrow|ургуул|баталгаатай.*үр дүн/i.test(text)) throw new Error("use database for facts");
    data[key] = text.trim();
  }
  return data;
}
