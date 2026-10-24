/** Accept pasted order numbers without removing meaningful spaces from customer names. */
export function normalizeOrderId(input: string) {
  return input.trim().replace(/^#\s*/, "");
}
