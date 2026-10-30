"use client";

import { createContext, useContext } from "react";
import { api } from "./api";
import type { OrderStatus, RawOrder } from "@/app/(admin)/admin/[locale]/(orders)/components/type";

export type AdminView = "overview" | "orders" | "messages" | "products" | "revenue" | "assistant";
export const ADMIN_VIEWS: AdminView[] = ["overview", "orders", "messages", "products", "revenue", "assistant"];
/** Older links (Telegram alerts, bookmarks) keep working. */
export const VIEW_ALIASES: Record<string, AdminView> = { chatbot: "messages" };

export type ChatCounts = { unread: number; needsHuman: boolean; paused: boolean };
/** A chat needs the owner when the customer wrote something new, or asked for a person and nobody has taken it yet. */
export const chatNeedsYou = (c: ChatCounts) => c.unread > 0 || (c.needsHuman && !c.paused);

export type AdminSummary = {
  ready: boolean;
  ordersFailed: boolean;
  chatFailed: boolean;
  counts: Partial<Record<OrderStatus, number>>;
  /** Bank transfers waiting for the owner to confirm the money arrived (newest 100 waiting orders). */
  bankToCheck: number;
  toShip: number;
  toConfirm: number;
  /** Among the 30 most recent chats. */
  chatsNeedingYou: number;
  newRequests: number;
  bot: { enabled: boolean; metaOutbound: boolean } | null;
};

export const EMPTY_SUMMARY: AdminSummary = {
  ready: false,
  ordersFailed: false,
  chatFailed: false,
  counts: {},
  bankToCheck: 0,
  toShip: 0,
  toConfirm: 0,
  chatsNeedingYou: 0,
  newRequests: 0,
  bot: null,
};

export const ordersBadge = (s: AdminSummary) => s.toConfirm + s.toShip + s.bankToCheck;
export const messagesBadge = (s: AdminSummary) => s.chatsNeedingYou + s.newRequests;

/** Everything the menu badges and the overview's to-do list need, from the existing admin APIs. */
export async function loadSummary(signal?: AbortSignal): Promise<AdminSummary> {
  const [orders, chats, analytics, settings] = await Promise.allSettled([
    // Status counts cover every order (the status filter only narrows the returned rows).
    api.get("/order", { params: { status: "WAITING_PAYMENT", limit: 100 }, signal }),
    api.get("/chatbot/admin/conversations", { params: { page: 1 }, signal }),
    api.get("/chatbot/admin/analytics", { signal }),
    api.get("/chatbot/admin/settings", { signal }),
  ]);
  const counts: Partial<Record<OrderStatus, number>> = orders.status === "fulfilled" ? orders.value.data?.counts ?? {} : {};
  const waiting: RawOrder[] = orders.status === "fulfilled" && Array.isArray(orders.value.data?.orders) ? orders.value.data.orders : [];
  const rows: ChatCounts[] = chats.status === "fulfilled" && Array.isArray(chats.value.data?.rows) ? chats.value.data.rows : [];
  const stats = analytics.status === "fulfilled" ? analytics.value.data?.stats : null;
  const bot = settings.status === "fulfilled" && settings.value.data ? settings.value.data : null;
  return {
    ready: true,
    ordersFailed: orders.status === "rejected",
    chatFailed: chats.status === "rejected",
    counts,
    bankToCheck: waiting.filter((o) => o.paymentMethod === "BANK").length,
    toShip: (counts.PAID ?? 0) + (counts.COD_PENDING ?? 0),
    toConfirm: counts.PENDING ?? 0,
    chatsNeedingYou: rows.filter(chatNeedsYou).length,
    newRequests: Number(stats?.newLeads) || 0,
    bot: bot ? { enabled: Boolean(bot.enabled), metaOutbound: Boolean(bot.metaOutbound) } : null,
  };
}

export type AdminNav = {
  view: AdminView;
  /** Open another section, optionally with filters (e.g. go("orders", { tab: "to_ship" })). */
  go: (view: AdminView, params?: Record<string, string | undefined>) => void;
  /** Change this section's part of the address (open order, tab...). "push" lets the back button undo it. */
  setParams: (patch: Record<string, string | null | undefined>, mode?: "push" | "replace") => void;
  summary: AdminSummary;
  refreshSummary: () => void;
  /** Update the shared chat-assistant settings after a save elsewhere. */
  setBot: (bot: AdminSummary["bot"]) => void;
};

const AdminNavContext = createContext<AdminNav | null>(null);
export const AdminNavProvider = AdminNavContext.Provider;

export function useAdminNav() {
  const ctx = useContext(AdminNavContext);
  if (!ctx) throw new Error("useAdminNav must be used inside the admin home page");
  return ctx;
}
