"use client";

import { useState } from "react";
import { AdminTopBar } from "./AdminTopBar";
import { AdminView, Sidebar } from "../Sidebar";

export default function AdminLayout({
  children,
  active,
  onNavigate,
  openOrders,
}: {
  children: React.ReactNode;
  active: AdminView;
  onNavigate: (view: AdminView) => void;
  openOrders?: number;
}) {
  const [open, setOpen] = useState(false);

  // The page is rendered once; only the navigation differs between desktop and mobile
  return (
    <div className="min-h-screen w-full lg:flex">
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-white focus:p-3">Skip to content</a>
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 lg:block">
        <Sidebar active={active} onNavigate={onNavigate} openOrders={openOrders} />
      </aside>

      <div className="lg:hidden">
        <AdminTopBar onMenu={() => setOpen(true)} openOrders={openOrders} />
        <Sidebar
          active={active}
          onNavigate={onNavigate}
          openOrders={openOrders}
          isMobile
          open={open}
          onClose={() => setOpen(false)}
        />
      </div>

      <main id="admin-main" tabIndex={-1} className="w-full min-w-0 flex-1 px-[16px] pb-[32px] pt-[80px] lg:px-[32px] lg:py-[36px]">
        <div className="mx-auto w-full max-w-[1600px]">{children}</div>
      </main>
    </div>
  );
}
