"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AdminLayout from "@admin/components/admin/AdminLayout";
import { LoadingRows } from "@admin/components/ui/feedback";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { useAuth } from "@admin/provider/AuthProvider";
import {
  ADMIN_VIEWS,
  AdminNav,
  AdminNavProvider,
  AdminSummary,
  AdminView,
  EMPTY_SUMMARY,
  VIEW_ALIASES,
  loadSummary,
} from "@admin/lib/adminNav";
import { STORE } from "@/config/store";

function PanelLoading() {
  return <LoadingRows rows={4} className="p-0" rowClassName="h-[72px]" />;
}

const Overview = dynamic(() => import("@admin/components/admin/Overview"), { loading: PanelLoading });
const OrdersAdmin = dynamic(() => import("../(orders)/OrdersAdmin"), { loading: PanelLoading });
const ProductCatalog = dynamic(() => import("../(products)/ProductCatalog").then((module) => module.ProductCatalog), { loading: PanelLoading });
const RevenueDashboard = dynamic(() => import("../(revenue)/RevenueDashboard"), { loading: PanelLoading });
const MessagesDashboard = dynamic(() => import("@admin/components/chatbot/MessagesDashboard").then((module) => module.MessagesDashboard), { loading: PanelLoading });
const AssistantDashboard = dynamic(() => import("@admin/components/chatbot/AssistantDashboard").then((module) => module.AssistantDashboard), { loading: PanelLoading });

function AdminHome() {
  const router = useRouter();
  const { t } = useI18n();
  const { token } = useAuth();
  const pathname = usePathname() ?? "/admin/mn/home-page";
  const params = useSearchParams();
  const raw = params?.get("view") ?? "";
  const view: AdminView = (ADMIN_VIEWS as string[]).includes(raw) ? (raw as AdminView) : VIEW_ALIASES[raw] ?? "overview";
  const [summary, setSummary] = useState<AdminSummary>(EMPTY_SUMMARY);
  const request = useRef<AbortController | null>(null);

  // Keep the current section (and its filters) in the URL so refresh, back and shared links land on it
  const go = useCallback<AdminNav["go"]>((next, extra) => {
    const query = new URLSearchParams();
    if (next !== "overview") query.set("view", next);
    for (const [key, value] of Object.entries(extra ?? {})) if (value) query.set(key, value);
    const qs = query.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    window.scrollTo({ top: 0 });
  }, [router, pathname]);

  const setParams = useCallback<AdminNav["setParams"]>((patch, mode = "replace") => {
    const query = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(patch)) {
      if (value) query.set(key, value);
      else query.delete(key);
    }
    const qs = query.toString();
    const url = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
    if (mode === "push") window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
  }, []);

  const refreshSummary = useCallback(async () => {
    if (!token) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    try {
      const next = await loadSummary(controller.signal);
      if (!controller.signal.aborted) setSummary(next);
    } catch {
      // Counts are a convenience; each page shows its own errors.
    }
  }, [token]);

  useEffect(() => {
    void refreshSummary();
    const tick = () => { if (document.visibilityState === "visible") void refreshSummary(); };
    const id = setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
      request.current?.abort();
    };
  }, [refreshSummary]);

  useEffect(() => {
    document.title = `${t(`nav.${view}`)} · ${STORE.name}`;
  }, [t, view]);

  const navigate = useCallback((next: AdminView) => {
    if (next === view && !params?.toString().includes("&")) return;
    go(next);
  }, [go, view, params]);

  const setBot = useCallback<AdminNav["setBot"]>((bot) => setSummary((current) => ({ ...current, bot })), []);
  // refreshSummary and setBot keep one identity, so pages that poll don't restart when the counts change
  const nav = useMemo<AdminNav>(() => ({ view, go, setParams, summary, refreshSummary, setBot }), [view, go, setParams, summary, refreshSummary, setBot]);

  return (
    <AdminNavProvider value={nav}>
      <AdminLayout active={view} onNavigate={navigate} summary={summary}>
        {view === "overview" && <Overview />}
        {view === "orders" && <OrdersAdmin />}
        {view === "messages" && <MessagesDashboard />}
        {view === "products" && <ProductCatalog />}
        {view === "revenue" && <RevenueDashboard />}
        {view === "assistant" && <AssistantDashboard />}
      </AdminLayout>
    </AdminNavProvider>
  );
}

export default function HomePage() {
  return (
    <Suspense>
      <AdminHome />
    </Suspense>
  );
}
