"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useStoreT } from "@/components/store/lib/useStoreT";
import { isGuestEmail } from "@/components/store/lib/product";
import { handleLogout } from "./handlers/handleLogout";

export const EmailLoggedIn = ({ email, closeSheet }: { email: string; closeSheet: () => void }) => {
  const router = useRouter();
  const { st, locale } = useStoreT();
  const isGuest = isGuestEmail(email);

  const go = (href: string) => {
    closeSheet();
    router.push(href);
  };

  return (
    <div className="flex flex-1 flex-col px-[24px] md:px-[30px]">
      <p className="store-heading text-[40px]">{st("greeting")}</p>
      {!isGuest && <p className="mt-[4px] truncate text-[14px] text-ink/60">{email}</p>}

      <nav className="mt-[28px] border-t border-ink/10">
        {[
          [st("tab_orders"), `/${locale}/profile?tab=orders`],
          [st("tab_profile"), `/${locale}/profile?tab=profile`],
        ].map(([label, href]) => (
          <button
            key={href}
            type="button"
            onClick={() => go(href)}
            className="group flex w-full items-center justify-between border-b border-ink/10 py-[18px] text-left text-[16px] text-ink"
          >
            {label}
            <ArrowRight className="h-[16px] w-[16px] text-ink/40 transition-transform duration-500 ease-silk group-hover:translate-x-[3px] group-hover:text-ink" strokeWidth={1.3} />
          </button>
        ))}
      </nav>

      <button
        type="button"
        onClick={() => {
          closeSheet();
          handleLogout(router, locale);
        }}
        className="link-underline mb-[28px] mt-auto self-start pt-[24px] text-[14px] text-ink/70"
      >
        {st("log_out")}
      </button>
    </div>
  );
};
