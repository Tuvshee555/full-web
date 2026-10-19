"use client";

import { ReactNode, useState, useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";

import Email from "@/components/header/email/Email";
import TopLoader from "./header/TopLoader";
import { AnnouncementBar, StoreHeader } from "./store/StoreHeader";
import { StoreFooter } from "./store/StoreFooter";
import { CartDrawer } from "./store/CartDrawer";
import { ShopChatWidget } from "./chatbot/ShopChatWidget";

export default function AppShellClient({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [accountOpen, setAccountOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const openAccount = useCallback(() => setAccountOpen(true), []);
  const closeCart = useCallback(() => setCartOpen(false), []);

  // "Add to cart" anywhere fires "cart-open" (Shopify cart drawer behaviour)
  useEffect(() => {
    const open = () => setCartOpen(true);
    window.addEventListener("cart-open", open);
    return () => window.removeEventListener("cart-open", open);
  }, []);

  // Shopify checkout has its own minimal header and no store chrome
  const isCheckout = /^\/(mn|en)\/checkout(\/|$)/.test(pathname ?? "");

  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-[16px] focus:top-[16px] focus:z-[1300] focus:bg-ink focus:px-[20px] focus:py-[12px] focus:text-paper">{pathname?.startsWith("/en") ? "Skip to content" : "Үндсэн хэсэг рүү"}</a>
      <TopLoader />

      {!isCheckout && (
        <>
          <AnnouncementBar />
          <StoreHeader onOpenAccount={openAccount} onOpenCart={() => setCartOpen(true)} />
        </>
      )}

      <main id="main-content" className="min-h-[60vh]">{children}</main>

      {!isCheckout && <StoreFooter />}

      <CartDrawer open={cartOpen} onClose={closeCart} />
      <Email open={accountOpen} onOpenChange={setAccountOpen} />
      {!isCheckout && <ShopChatWidget />}
    </>
  );
}
