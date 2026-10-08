import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/_next/", "/favicon", "/images", "/api", "/public"];

const LOCALES = ["mn", "en"];
const DEFAULT_LOCALE = "mn";

const LOCALE_RE = /^\/(mn|en)(?=\/|$)/;

// Admin auth pages that are always accessible without a token
const ADMIN_PUBLIC_AUTH_PATHS = [
  "/log-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
];

function adminProxy(request: NextRequest, pathname: string) {
  // Path below /admin, e.g. "/mn/home-page"
  const rest = pathname.slice("/admin".length) || "/";

  // 1. Locale redirect: /admin/foo -> /admin/mn/foo
  if (!LOCALE_RE.test(rest)) {
    const url = request.nextUrl.clone();
    url.pathname = `/admin/${DEFAULT_LOCALE}${rest === "/" ? "" : rest}`;
    return NextResponse.redirect(url);
  }

  // 2. Allow public auth pages (e.g. /admin/mn/log-in)
  const pathWithoutLocale = rest.replace(LOCALE_RE, "") || "/";
  if (ADMIN_PUBLIC_AUTH_PATHS.some((p) => pathWithoutLocale.startsWith(p))) {
    return NextResponse.next();
  }

  // 3. Auth protection: the adminToken cookie is written by the admin
  // AuthProvider.setAuthToken() alongside localStorage.
  const token = request.cookies.get("adminToken")?.value;
  if (!token) {
    const locale = rest.match(LOCALE_RE)?.[1] ?? DEFAULT_LOCALE;
    const loginUrl = new URL(`/admin/${locale}/log-in`, request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return adminProxy(request, pathname);
  }

  const hasLocale = LOCALES.some((locale) => pathname.startsWith(`/${locale}`));
  if (hasLocale) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/${DEFAULT_LOCALE}${pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
