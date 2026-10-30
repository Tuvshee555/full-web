"use client";

import { api } from "@admin/lib/api";
import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { OrderStatus, RawOrder, STATUS_FLOW, orderNumber } from "../type";

type T = (key: string, params?: Record<string, string | number>) => string;

export const ORDERS_PAGE_SIZE = 15;

/** A sentence the owner can act on, instead of the API's English error text. */
export function orderErrorMessage(err: unknown, t: T) {
  const status = axios.isAxiosError(err) ? err.response?.status : undefined;
  if (status === 409) return t("orders.errors.changed");
  if (status === 400) return t("orders.errors.not_allowed");
  if (status === 401 || status === 403) return t("common.errors.signed_out");
  if (axios.isAxiosError(err) && !err.response) return t("common.errors.offline");
  return t("orders.errors.update_failed");
}

export function useOrdersAdmin({
  token,
  t,
  search,
  statuses,
  onChanged,
}: {
  token: string | null;
  t: T;
  search: string;
  statuses: OrderStatus[];
  onChanged?: () => void;
}) {
  const [orders, setOrders] = useState<RawOrder[]>([]);
  const [counts, setCounts] = useState<Partial<Record<OrderStatus, number>>>({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [totalOrders, setTotalOrders] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const mutationPending = useRef(false);
  const loaded = useRef(false);

  const statusKey = statuses.join(",");

  useEffect(() => {
    if (!token) {
      setFetchError(t("common.errors.signed_out"));
      setLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    // Keep the current rows on screen while refreshing; only the first load shows placeholders.
    if (loaded.current) setRefreshing(true);
    else setLoading(true);
    setFetchError(null);

    api
      .get("/order", {
        params: { page, limit: ORDERS_PAGE_SIZE, search: search || undefined, status: statusKey || undefined },
        signal: controller.signal,
      })
      .then(({ data }) => {
        if (cancelled) return;
        setOrders(Array.isArray(data?.orders) ? data.orders : []);
        setCounts(data?.counts ?? {});
        const pages = Math.max(1, data?.pagination?.totalPages ?? 1);
        if (page > pages) setPage(pages);
        setTotalOrders(data?.pagination?.total ?? 0);
        loaded.current = true;
      })
      .catch(() => {
        if (cancelled) return;
        setFetchError(t("orders.errors.load_failed"));
        // Don't leave another tab's rows on screen under this tab's name.
        setOrders([]);
        setTotalOrders(0);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
        setRefreshing(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [token, t, page, search, statusKey, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const copy = async (text: string, done?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(done ?? t("common.copied"));
    } catch {
      toast.error(t("common.copy_failed"));
    }
  };

  const patchStatus = async (order: RawOrder, next: OrderStatus) => {
    const current = (order.status ?? "PENDING") as OrderStatus;
    if (!STATUS_FLOW[current]?.includes(next)) throw new Error("invalid transition");
    await api.patch(`/order/${order.id}`, { status: next });
  };

  /** One order to its next step. Returns true when it worked. */
  const changeStatus = async (order: RawOrder, next: OrderStatus) => {
    if (mutationPending.current) return false;
    mutationPending.current = true;
    setBusyId(order.id);
    try {
      await patchStatus(order, next);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: next } : o)));
      toast.success(t(`orders.done.${next}`, { order: orderNumber(order) }));
      // Refetch so the order moves to the right tab and the counts stay correct.
      reload();
      onChanged?.();
      return true;
    } catch (err) {
      toast.error(err instanceof Error && err.message === "invalid transition" ? t("orders.errors.not_allowed") : orderErrorMessage(err, t));
      return false;
    } finally {
      mutationPending.current = false;
      setBusyId(null);
    }
  };

  /** Several orders to the same next step, one after another, with one summary message. */
  const changeMany = async (list: RawOrder[], next: OrderStatus) => {
    if (mutationPending.current || !list.length) return 0;
    mutationPending.current = true;
    setBulkBusy(true);
    let ok = 0;
    const failed: string[] = [];
    for (const order of list) {
      try {
        await patchStatus(order, next);
        ok += 1;
      } catch {
        failed.push(`#${orderNumber(order)}`);
      }
    }
    if (ok) toast.success(t(`orders.bulk_done.${next}`, { count: ok }));
    if (failed.length) toast.error(t("orders.bulk_failed", { count: failed.length, orders: failed.join(", ") }));
    mutationPending.current = false;
    setBulkBusy(false);
    reload();
    onChanged?.();
    return ok;
  };

  return {
    orders,
    counts,
    totalOrders,
    page,
    loading,
    refreshing,
    fetchError,
    busyId,
    bulkBusy,
    setPage,
    reload,
    copy,
    changeStatus,
    changeMany,
  };
}
