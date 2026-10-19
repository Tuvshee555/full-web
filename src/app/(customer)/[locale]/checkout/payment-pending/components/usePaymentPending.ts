/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { API_BASE_URL } from "@/lib/api";
import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import { OrderData } from "./types";

const API_TIMEOUT = 30_000;

export function usePaymentPending() {
  const { t, locale } = useI18n();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [orderId, setOrderId] = useState<string | null>(null);
  const [resolvedOrderId, setResolvedOrderId] = useState(false);
  const [order, setOrder] = useState<OrderData | null>(null);

  const [qrText, setQrText] = useState<string | null>(null);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);

  const [paid, setPaid] = useState(false);
  const [requiresReview, setRequiresReview] = useState(false);
  const [status, setStatus] = useState<string>(t("payment_creating"));
  const [loadingOrder, setLoadingOrder] = useState(true);

  const pollRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const activeOrder = useRef<string | null>(null);

  // prevent spamming create invoice
  const creatingInvoiceRef = useRef<string | null>(null);

  /** 🧹 MOUNT / UNMOUNT */
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  /** 🔗 ORDER ID FROM URL / STORAGE */
  useEffect(() => {
    const fromUrl = searchParams?.get("orderId");
    if (fromUrl) {
      setOrderId(fromUrl);
      setResolvedOrderId(true);
      try {
        localStorage.setItem("lastOrderId", fromUrl);
      } catch {}
      return;
    }

    try {
      const stored = localStorage.getItem("lastOrderId");
      if (stored) setOrderId(stored);
      else setLoadingOrder(false);
    } catch { setLoadingOrder(false); }
    setResolvedOrderId(true);
  }, [searchParams]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  /** 📦 FETCH ORDER */
  const fetchOrder = useCallback(async (id: string) => {
    setLoadingOrder(true);

    try {
      const res = await axios.get(
        `${API_BASE_URL}/order/${id}`,
        {
          headers: getAuthHeaders(),
          timeout: API_TIMEOUT,
        }
      );

      if (!mountedRef.current || activeOrder.current !== id) return;

      const data = res.data ?? null;
      setOrder(data);
      if (data?.status === "CANCELLED" && data?.payment?.status === "PAID") {
        setRequiresReview(true);
        setPaid(false);
      }

      // Already paid: show the thank-you state here (Shopify-style order
      // confirmation) instead of bouncing to another page.
      if (data?.status === "PAID" || data?.status === "DELIVERING" || data?.status === "DELIVERED") {
        setPaid(true);
        setRequiresReview(false);
        setQrText(null);
        setStatus(t("payment_success"));
      }
    } catch {
      if (!mountedRef.current || activeOrder.current !== id) return;
      toast.error(t("order_not_found"));
      if (mountedRef.current) setOrder(null);
    } finally {
      if (mountedRef.current && activeOrder.current === id) setLoadingOrder(false);
    }
  }, []);

  /** 🧾 CREATE INVOICE */
  const createInvoice = useCallback(
    async (id: string, amount: number) => {
      if (creatingInvoiceRef.current === id) return;
      creatingInvoiceRef.current = id;

      try {
        if (mountedRef.current) setStatus(t("payment_creating"));

        const res = await axios.post(
          `${API_BASE_URL}/qpay/create`,
          { orderId: id, amount },
          {
            headers: getAuthHeaders(),
            timeout: API_TIMEOUT,
          }
        );

        if (!mountedRef.current || activeOrder.current !== id) return;

        if (!res.data?.qr_text || !res.data?.invoice_id) {
          toast.error(t("payment_qr_error"));
          setStatus(t("payment_create_fail"));
          return;
        }

        setQrText(res.data.qr_text);
        setInvoiceId(res.data.invoice_id);
        setStatus(t("payment_waiting"));
      } catch (error) {
        if (!mountedRef.current || activeOrder.current !== id) return;
        if (axios.isAxiosError(error) && error.response?.status === 409) void fetchOrder(id);
        if (mountedRef.current) {
          toast.error(t("payment_create_fail"));
          setStatus(t("payment_create_fail"));
        }
      } finally {
        if (creatingInvoiceRef.current === id) creatingInvoiceRef.current = null;
      }
    },
    [t, fetchOrder]
  );

  /** ✅ RUN ASAP WHEN ORDER ID EXISTS */
  useEffect(() => {
    if (!orderId) return;
    activeOrder.current = orderId;
    setOrder(null);
    setQrText(null);
    setInvoiceId(null);
    setPaid(false);
    setRequiresReview(false);

    // start fetching order immediately
    fetchOrder(orderId);

    // show user something instantly
    setStatus(t("payment_creating"));
  }, [orderId]);

  /** 🔑 WHEN ORDER ARRIVES: RESTORE OR CREATE */
  useEffect(() => {
    if (!order) return;

    // 🚚 NOT ONLINE PAYMENT
    if (order.paymentMethod !== "QPAY") {
      router.replace(`/${locale}/profile/orders/${order.id}`);
      return;
    }

    // ✅ restore existing payment quickly
    if (order.payment?.invoiceId) setInvoiceId(order.payment.invoiceId);
    if (order.payment?.qrText) setQrText(order.payment.qrText);

    // ✅ if already pending payment
    if (order.payment?.status === "PENDING") {
      setStatus(t("payment_waiting"));
    }

    // Paid / cancelled orders never need a new invoice
    if (order.status !== "WAITING_PAYMENT") return;

    // ✅ if order needs invoice — create immediately
    if (
      order.status === "WAITING_PAYMENT" &&
      !order.payment?.invoiceId &&
      !invoiceId &&
      !qrText
    ) {
      if (!order.id) return;
      const amount = Number(order.totalPrice ?? 0);
      if (amount <= 0) return;

      createInvoice(order.id, amount);
    }
  }, [order]);

  /** 🔁 POLLING PAYMENT STATUS */
  useEffect(() => {
    if (!invoiceId || paid || requiresReview) return;
    let checking = false;
    const controller = new AbortController();

    const check = async () => {
      try {
        const res = await axios.post(
          `${API_BASE_URL}/qpay/check`,
          { invoiceId },
          { headers: getAuthHeaders(), timeout: API_TIMEOUT, signal: controller.signal }
        );
        return res.data;
      } catch {
        return null;
      }
    };

    const poll = async () => {
      if (checking || document.hidden || controller.signal.aborted) return;
      checking = true;
      const data = await check();
      checking = false;
      if (data?.orderStatus === "CANCELLED" && !data?.paid && !controller.signal.aborted && activeOrder.current === orderId) {
        setOrder((previous) => previous ? { ...previous, status: "CANCELLED" } : previous);
        setQrText(null);
        if (pollRef.current) clearInterval(pollRef.current);
        return;
      }

      if (data?.paid && mountedRef.current && !controller.signal.aborted && activeOrder.current === orderId) {
        setPaid(!data.requiresReview);
        setRequiresReview(Boolean(data.requiresReview));
        setStatus(t("payment_success"));
        if (pollRef.current) clearInterval(pollRef.current);
        // Stay on the thank-you state; refresh the order so it shows as paid
        if (orderId) fetchOrder(orderId);
      }
    };
    void poll();
    pollRef.current = window.setInterval(poll, 6000);
    const onVisible = () => { if (!document.hidden) void poll(); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      controller.abort();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [invoiceId, paid, requiresReview, orderId]);

  /** ✅ USER MANUAL RETRY */
  const retryCreateInvoice = async () => {
    if (!orderId) return;
    if (!order) {
      await fetchOrder(orderId);
      return;
    }
    if (order.paymentMethod !== "QPAY") return;
    if (!order.id) return;
    await createInvoice(order.id, order.totalPrice ?? 0);
  };

  return {
    t,
    orderId,
    resolvedOrderId,
    order,
    qrText,
    paid,
    requiresReview,
    status,
    loadingOrder,

    retryCreateInvoice, // ✅ allow retry button UI
    invoiceId,
  };
}
