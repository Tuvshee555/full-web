"use client";

import { API_BASE_URL } from "@admin/lib/api";
import { Suspense, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AdminLayout from "@admin/components/admin/AdminLayout";
import { AdminView } from "@admin/components/Sidebar";
import RevenueDashboard from "@/app/(admin)/admin/[locale]/(revenue)/RevenueDashboard";
import { FoodMenu } from "../(food-menu)/FoodMenu";
import OrdersAdmin from "../(orders)/OrdersAdmin";
import { OPEN_STATUSES } from "../(orders)/components/type";

const VIEWS: AdminView[] = ["products", "orders", "revenue"];

function AdminHome() {
  const router = useRouter();
  const pathname = usePathname() ?? "/admin/home-page";
  const params = useSearchParams();
  const fromUrl = params?.get("view") as AdminView | null;
  const view: AdminView = fromUrl && VIEWS.includes(fromUrl) ? fromUrl : "products";
  const [openOrders, setOpenOrders] = useState(0);

  // Keep the current section in the URL so refresh/back/links land on it
  const navigate = (next: AdminView) => {
    router.replace(next === "products" ? pathname : `${pathname}?view=${next}`, { scroll: false });
    window.scrollTo({ top: 0 });
  };

  const refreshOpenOrders = useCallback(async () => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/order?limit=1`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) return;
      const counts: Record<string, number> = (await res.json())?.counts ?? {};
      setOpenOrders(OPEN_STATUSES.reduce((s, st) => s + (counts[st] ?? 0), 0));
    } catch {
      // badge is a nicety; ignore network errors
    }
  }, []);

  useEffect(() => {
    refreshOpenOrders();
    const id = setInterval(refreshOpenOrders, 60_000);
    return () => clearInterval(id);
  }, [refreshOpenOrders, view]);

  return (
    <AdminLayout active={view} onNavigate={navigate} openOrders={openOrders}>
      {view === "products" && <FoodMenu />}
      {view === "orders" && <OrdersAdmin onChanged={refreshOpenOrders} />}
      {view === "revenue" && <RevenueDashboard />}
    </AdminLayout>
  );
}

export default function HomePage() {
  return (
    <Suspense>
      <AdminHome />
    </Suspense>
  );
}
