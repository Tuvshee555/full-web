"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStoreT } from "@/components/store/lib/useStoreT";
import { isGuestEmail } from "@/components/store/lib/product";
import { OrdersList } from "./profile/OrdersList";
import { ProfileInfo } from "./profile/ProfileInfo";

export type Tab = "orders" | "profile";

/** Shopify-style account page in the Lorentz look: greeting, two tabs, log out. */
export default function ProfileInner() {
  const { st, locale } = useStoreT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [tab, setTab] = useState<Tab>("orders");

  useEffect(() => {
    setEmail(localStorage.getItem("email") ?? "");
    const q = searchParams.get("tab");
    setTab(q === "profile" ? "profile" : "orders");
  }, [searchParams]);

  const changeTab = (next: Tab) => {
    setTab(next);
    router.replace(`/${locale}/profile?tab=${next}`, { scroll: false });
  };

  // Log out but keep the cart (old code cleared all of localStorage)
  const logout = () => {
    for (const k of ["token", "userId", "email", "guest"]) localStorage.removeItem(k);
    window.dispatchEvent(new Event("auth-changed"));
    router.push(`/${locale}`);
  };

  const isGuest = isGuestEmail(email);

  return (
    <div className="page-width pb-[96px] pt-[40px] md:pt-[72px]">
      <div className="flex flex-wrap items-end justify-between gap-[16px]">
        <div>
          <span className="eyebrow">{st("account")}</span>
          <h1 className="store-heading mt-[10px] text-[48px] md:text-[72px]">{st("greeting")}</h1>
          {!isGuest && <p className="mt-[6px] text-[15px] text-ink/60">{email}</p>}
        </div>
        <button type="button" onClick={logout} className="link-underline text-[14px] text-ink">
          {st("log_out")}
        </button>
      </div>

      <div role="tablist" className="mt-[40px] flex gap-[28px] border-b border-ink/15">
        {(["orders", "profile"] as Tab[]).map((k) => (
          <button
            key={k}
            role="tab"
            type="button"
            aria-selected={tab === k}
            onClick={() => changeTab(k)}
            className={`-mb-px border-b-2 pb-[14px] text-[15px] transition-colors ${
              tab === k ? "border-ink text-ink" : "border-transparent text-ink/50 hover:text-ink"
            }`}
          >
            {k === "orders" ? st("tab_orders") : st("tab_profile")}
          </button>
        ))}
      </div>

      <div className="pt-[32px]">{tab === "orders" ? <OrdersList /> : <ProfileInfo />}</div>
    </div>
  );
}
