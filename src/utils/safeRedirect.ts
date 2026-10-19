/** Only application-relative paths may be passed to the router after login. */
export function safeReturnPath(value: unknown, fallback = "/mn") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(value)) return fallback;
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(decoded)) return fallback;
  } catch { return fallback; }
  return value;
}
