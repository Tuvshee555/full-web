"use client";

import { ReactNode, useState, useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";

import Email from "@/components/header/email/Email";
import TopLoader from "./header/TopLoader";
import { AnnouncementBar, StoreHeader } from "./store/StoreHeader";
import { StoreFooter } from "./store/StoreFooter";
import { CartDrawer } from "./store/CartDrawer";

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
      <TopLoader />

      {!isCheckout && (
        <>
          <AnnouncementBar />
          <StoreHeader onOpenAccount={openAccount} onOpenCart={() => setCartOpen(true)} />
        </>
      )}

      <main className="min-h-[60vh]">{children}</main>

      {!isCheckout && <StoreFooter />}

      <CartDrawer open={cartOpen} onClose={closeCart} />
      <Email open={accountOpen} onOpenChange={setAccountOpen} />
    </>
  );
}
