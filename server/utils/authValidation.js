export function normalizeEmail(value) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

// bcrypt only considers the first 72 bytes; reject longer passwords explicitly.
export function validPassword(value, minimum = 8) {
  return typeof value === "string" && value.length >= minimum && Buffer.byteLength(value, "utf8") <= 72;
}
