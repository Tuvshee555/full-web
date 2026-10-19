"use client";

/** One admin logout for every button: clears storage AND the auth cookie
 *  (the header/top-bar versions left the cookie, so /admin still let you in). */
export function adminLogout(push: (url: string) => void) {
  for (const k of ["adminToken", "adminEmail", "adminUserId", "adminUser"]) localStorage.removeItem(k);
  document.cookie = "adminToken=; path=/; max-age=0; SameSite=Strict";
  const locale = window.location.pathname.match(/^\/admin\/(mn|en)(?:\/|$)/)?.[1] ?? "mn";
  push(`/admin/${locale}/log-in`);
}
