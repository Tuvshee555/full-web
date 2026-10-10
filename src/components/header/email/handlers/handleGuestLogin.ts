/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { guestLogin } from "@/app/(customer)/[locale]/sign-in/components/helpers";

// The server issues a real guest JWT; guestLogin stores it and redirects.
// (This used to overwrite that JWT with a fake "guest-token-…" string, which
// made the guest's next order fail with 401.)
export const handleGuestLogin = async (redirect: string, router: any, locale: string) => {
  await guestLogin(`/${locale}${redirect}`, router.push);
};
