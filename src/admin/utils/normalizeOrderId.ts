// src/utils/normalizeOrderId.ts
export function normalizeOrderId(input: string) {
  return input.trim().toUpperCase().replace(/\s+/g, "").replace(/^#/, "");
}
