"use client";

import { API_BASE_URL } from "@admin/lib/api";
import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { OrderStatus, RawOrder, STATUS_FLOW } from "../type";

export function useOrdersAdmin(
  token: string | null,
  t: (key: string) => string,
  search: string,
  statuses: OrderStatus[],
  onChanged?: () => void
) {
  const [orders, setOrders] = useState<RawOrder[]>([]);
  const [counts, setCounts] = useState<Partial<Record<OrderStatus, number>>>({});
  const [page, setPage] = useState(1);
  const limit = 15;
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const mutationPending = useRef(false);

  const statusKey = statuses.join(",");

  useEffect(() => {
    if (!token) {
      setFetchError(t("unauthorized"));
      setLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setFetchError(null);

    axios
      .get(`${API_BASE_URL}/order`, {
        params: { page, limit, search: search || undefined, status: statusKey || undefined },
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      })
      .then(({ data }) => {
        if (cancelled) return;
        setOrders(Array.isArray(data?.orders) ? data.orders : []);
        setCounts(data?.counts ?? {});
        const pages = Math.max(1, data?.pagination?.totalPages ?? 1);
        setTotalPages(pages);
        if (page > pages) setPage(pages);
        setTotalOrders(data?.pagination?.total ?? 0);
      })
      .catch(() => {
        if (cancelled) return;
        setFetchError(t("fetch_failed"));
        setOrders([]);
        setTotalPages(1);
        setTotalOrders(0);
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [token, t, page, limit, search, statusKey, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("copied"));
    } catch {
      toast.error(t("copy_failed"));
    }
  };

  const changeStatus = async (orderId: string, nextStatus: OrderStatus) => {
    if (mutationPending.current) return;
    if (!token) {
      toast.error(t("unauthorized"));
      return;
    }
    const current = orders.find((o) => o.id === orderId);
    if (!current) return;
    const currentStatus = (current.status ?? "PENDING") as OrderStatus;
    if (!STATUS_FLOW[currentStatus]?.includes(nextStatus)) {
      toast.error(t("invalid_status_transition"));
      return;
    }

    mutationPending.current = true;
    setBusyId(orderId);
    try {
      await axios.patch(
        `${API_BASE_URL}/order/${orderId}`,
        { status: nextStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o)));
      setCounts((prev) => ({
        ...prev,
        [currentStatus]: Math.max(0, (prev[currentStatus] ?? 1) - 1),
        [nextStatus]: (prev[nextStatus] ?? 0) + 1,
      }));
      toast.success(`${t("status_updated")}: ${t(`order_status.${nextStatus}`)}`);
      // Refetch the filtered page so moved orders and pagination stay correct.
      reload();
      onChanged?.();
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : null;
      toast.error(msg || t("status_update_failed"));
    } finally {
      mutationPending.current = false;
      setBusyId(null);
    }
  };

  return {
    orders,
    counts,
    totalOrders,
    page,
    limit,
    loading,
    fetchError,
    totalPages,
    busyId,
    setPage,
    reload,
    copy,
    changeStatus,
  };
}
