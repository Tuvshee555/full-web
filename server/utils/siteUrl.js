// The site's own public address, with no trailing slash.
//   local dev      -> http://localhost:3000
//   Vercel         -> https://<production domain> (VERCEL_PROJECT_PRODUCTION_URL is set by Vercel)
//   custom domain  -> set FRONTEND_URL (and BACKEND_URL if the API lives elsewhere)
const trim = (u) => u.replace(/\/+$/, "");

export function siteUrl() {
  const explicit = process.env.FRONTEND_URL || process.env.CUSTOMER_URL || process.env.NEXT_PUBLIC_FRONTEND_URL;
  if (explicit) return trim(explicit);
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return `http://localhost:${process.env.PORT || 3000}`;
}

/** Where the API is reachable from outside (used for the QPay callback). */
export function apiUrl() {
  return process.env.BACKEND_URL ? trim(process.env.BACKEND_URL) : `${siteUrl()}/api`;
}
