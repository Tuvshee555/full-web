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
    <div className="min-h-screen w-full md:flex">
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 md:block">
        <Sidebar active={active} onNavigate={onNavigate} openOrders={openOrders} />
      </aside>

      <div className="md:hidden">
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

      <main className="w-full min-w-0 flex-1 overflow-x-hidden px-[16px] pb-[32px] pt-[76px] md:px-[32px] md:py-[32px] xl:px-[48px]">
        <div className="mx-auto max-w-[1280px]">{children}</div>
      </main>
    </div>
  );
}
