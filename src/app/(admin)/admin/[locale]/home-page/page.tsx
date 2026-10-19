"use client";

import { API_BASE_URL } from "@admin/lib/api";
import { Suspense, useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AdminLayout from "@admin/components/admin/AdminLayout";
import { AdminView } from "@admin/components/Sidebar";
import { OPEN_STATUSES } from "../(orders)/components/type";
import { Skeleton } from "@admin/components/ui/skeleton";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";

function PanelLoading() {
  const { t } = useI18n();
  return <div role="status" className="space-y-4"><span className="sr-only">{t("common.loading")}</span><Skeleton className="h-10 w-52" /><Skeleton className="h-12 w-full" /><Skeleton className="h-64 w-full" /></div>;
}

const ProductCatalog = dynamic(() => import("../(products)/ProductCatalog").then((module) => module.ProductCatalog), { loading: PanelLoading });
const OrdersAdmin = dynamic(() => import("../(orders)/OrdersAdmin"), { loading: PanelLoading });
const RevenueDashboard = dynamic(() => import("../(revenue)/RevenueDashboard"), { loading: PanelLoading });
const ChatbotDashboard = dynamic(() => import("@admin/components/chatbot/ChatbotDashboard").then((module) => module.ChatbotDashboard), { loading: PanelLoading });

const VIEWS: AdminView[] = ["products", "orders", "revenue", "chatbot"];

function AdminHome() {
  const router = useRouter();
  const pathname = usePathname() ?? "/admin/home-page";
  const params = useSearchParams();
  const fromUrl = params?.get("view") as AdminView | null;
  const view: AdminView = fromUrl && VIEWS.includes(fromUrl) ? fromUrl : "products";
  const [openOrders, setOpenOrders] = useState(0);

  // Keep the current section in the URL so refresh/back/links land on it
  const navigate = (next: AdminView) => {
    if (next === view) return;
    router.push(next === "products" ? pathname : `${pathname}?view=${next}`, { scroll: false });
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
      {view === "products" && <ProductCatalog />}
      {view === "orders" && <OrdersAdmin onChanged={refreshOpenOrders} />}
      {view === "revenue" && <RevenueDashboard />}
      {view === "chatbot" && <ChatbotDashboard />}
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
