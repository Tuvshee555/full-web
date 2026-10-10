"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import TranslateButton from "./translate/TranslateButton";
import { adminLogout } from "@admin/utils/logout";

/** Slim admin top bar: language + signed-in email + logout. Hidden on auth pages. */
export default function Header() {
  const [email, setEmail] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname() ?? "";

  useEffect(() => setEmail(localStorage.getItem("adminEmail")), [pathname]);

  if (/\/(log-in|sign-up|forgot-password|reset-password)/.test(pathname)) return null;

  return (
    <header className="sticky top-0 z-40 hidden h-[56px] border-b border-ink/10 bg-paper/90 backdrop-blur-md md:block">
      <div className="flex h-full items-center justify-end gap-[18px] px-[28px] text-[13px]">
        <TranslateButton />
        {email && <span className="text-ink/55">{email}</span>}
        <button type="button" onClick={() => adminLogout(router.push)} className="flex items-center gap-[6px] text-ink/70 transition-colors hover:text-ink">
          <LogOut className="h-[14px] w-[14px]" strokeWidth={1.3} />
        </button>
      </div>
    </header>
  );
}
