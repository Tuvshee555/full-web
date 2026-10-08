"use client";

import { useState } from "react";
import { AdminTopBar } from "./AdminTopBar";
import { Sidebar } from "../Sidebar";

export default function AdminLayout({
  children,
  setPage,
}: {
  children: React.ReactNode;
  setPage: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen w-full overflow-x-hidden">
      {/* Desktop layout */}
      <div className="hidden md:flex min-h-screen">
        <aside className="w-[240px] shrink-0">
          <Sidebar setPage={setPage} />
        </aside>

        <main className="flex-1 p-4">{children}</main>
      </div>

      {/* Mobile layout */}
      <div className="md:hidden">
        <AdminTopBar onMenu={() => setOpen(true)} />

        <Sidebar
          setPage={setPage}
          isMobile
          open={open}
          onClose={() => setOpen(false)}
        />

        <main className="pt-14 px-4 pb-4 w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
