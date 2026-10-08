"use client";

import { API_BASE_URL } from "@admin/lib/api";
import axios from "axios";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { OrderStatus, RawOrder, STATUS_FLOW } from "../type";

export function useOrdersAdmin(
  token: string | null,
  t: (key: string) => string,
  search: string
) {
  const [orders, setOrders] = useState<RawOrder[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const limit = 10;
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  useEffect(() => {
    if (!token) {
      setFetchError(t("unauthorized"));
      setLoading(false);
      return;
    }

    setLoading(true);
    setFetchError(null);

    axios
      .get(`${API_BASE_URL}/order`, {
        params: {
          page,
          limit,
          search: search || undefined,
        },
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(({ data }) => {
        if (Array.isArray(data?.orders)) {
          setOrders(data.orders);
          setTotalPages(data?.pagination?.totalPages ?? 1);
          setTotalOrders(data?.pagination?.total ?? data.orders.length);
        } else if (Array.isArray(data)) {
          setOrders(data);
          setTotalPages(Math.max(1, Math.ceil(data.length / limit)));
          setTotalOrders(data.length);
        } else if (Array.isArray(data?.ordersList)) {
          setOrders(data.ordersList);
          setTotalPages(Math.max(1, Math.ceil(data.ordersList.length / limit)));
          setTotalOrders(data.ordersList.length);
        } else {
          setOrders([]);
          setTotalPages(1);
          setTotalOrders(0);
        }
      })
      .catch(() => {
        setFetchError(t("fetch_failed"));
        setOrders([]);
        setTotalPages(1);
        setTotalOrders(0);
      })
      .finally(() => setLoading(false));
  }, [token, t, page, limit, search]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("copied"));
    } catch {
      toast.error(t("copy_failed"));
    }
  };

  const changeStatus = async (orderId: string, nextStatus: OrderStatus) => {
    if (!token) {
      toast.error(t("unauthorized"));
      return;
    }

    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx === -1) return;

    const current = orders[idx];
    const currentStatus = (current.status ?? "PENDING") as OrderStatus;

    if (!STATUS_FLOW[currentStatus].includes(nextStatus)) {
      toast.error(t("invalid_status_transition"));
      return;
    }

    const before = orders[idx];
    const optimistic = [...orders];
    optimistic[idx] = { ...before, status: nextStatus };
    setOrders(optimistic);

    try {
      await axios.patch(
        `${API_BASE_URL}/order/${orderId}`,
        { status: nextStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(t("status_updated"));
    } catch {
      setOrders((prev) => {
        const rollback = [...prev];
        rollback[idx] = before;
        return rollback;
      });
      toast.error(t("status_update_failed"));
    }
  };

  return {
    orders,
    totalOrders,
    expanded,
    page,
    limit,
    loading,
    fetchError,
    totalPages,
    setPage,
    toggle,
    copy,
    changeStatus,
  };
}
