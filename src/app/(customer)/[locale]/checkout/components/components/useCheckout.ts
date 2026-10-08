/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { API_BASE_URL } from "@/lib/api";
import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import { useAuth } from "@/app/(customer)/[locale]/provider/AuthProvider";
import { DELIVERY_FEE, DeliveryZone, ULAANBAATAR_DISTRICTS } from "@/data/mongoliaLocations";
import { clearCart, type StoreCartItem } from "@/components/store/lib/cart";

/** Payment methods offered at checkout (no cards). Must match the backend enum. */
export type PaymentMethod = "QPAY" | "BANK";

export type DeliveryFormData = {
  deliveryZone?: DeliveryZone;
  firstName?: string;
  lastName?: string;
  phonenumber?: string;
  city?: string;
  district?: string;
  khoroo?: string;
  address?: string;
  notes?: string;
};

const REQUIRED: (keyof DeliveryFormData)[] = ["phonenumber", "firstName", "lastName", "city", "district", "khoroo", "address"];

const newKey = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

/** Shopify-style guest checkout: get a real server-issued guest JWT on demand. */
async function createGuestSession(): Promise<string | null> {
  let guestId = localStorage.getItem("userId");
  if (!guestId || !guestId.startsWith("guest-")) guestId = `guest-${newKey()}`;
  const res = await fetch(`${API_BASE_URL}/user/guest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ guestId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.token) return null;
  localStorage.setItem("token", data.token);
  localStorage.setItem("userId", data.user?.id ?? guestId);
  localStorage.setItem("email", data.user?.email ?? "Guest User");
  localStorage.setItem("guest", "true");
  window.dispatchEvent(new Event("auth-changed"));
  return data.token;
}

export function useCheckout(cart: StoreCartItem[]) {
  const router = useRouter();
  const { userId, token } = useAuth();
  const { locale, t } = useI18n();
  const st = (k: string) => t(`store.${k}`);

  const [form, setForm] = useState<DeliveryFormData>({
    deliveryZone: "UB",
    city: "Улаанбаатар",
    district: ULAANBAATAR_DISTRICTS[0],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("QPAY");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const idempotencyKey = useRef(newKey());

  const productTotal = useMemo(() => cart.reduce((s, i) => s + Number(i.food?.price ?? 0) * (Number(i.quantity) || 0), 0), [cart]);
  const deliveryFee = DELIVERY_FEE;
  const total = productTotal + deliveryFee;

  // Prefill from the saved profile (logged-in or returning guest)
  const loaded = useRef(false);
  useEffect(() => {
    if (!userId || !token || loaded.current) return;
    loaded.current = true;
    axios
      .get(`${API_BASE_URL}/user/${userId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        const u = res.data?.user;
        if (!u) return;
        setForm((prev) => ({
          ...prev,
          deliveryZone: u.deliveryZone === "RURAL" ? "RURAL" : prev.deliveryZone,
          firstName: u.firstName || prev.firstName,
          lastName: u.lastName || prev.lastName,
          phonenumber: u.phonenumber || prev.phonenumber,
          city: u.city || prev.city,
          district: u.district || prev.district,
          khoroo: u.khoroo || prev.khoroo,
          address: u.address || prev.address,
        }));
      })
      .catch(() => {});
  }, [userId, token]);

  const validate = () => {
    const next: Record<string, string> = {};
    for (const k of REQUIRED) if (!String(form[k] ?? "").trim()) next[k] = st("required");
    const phone = String(form.phonenumber ?? "").replace(/\s|-/g, "");
    if (phone && !/^\d{8}$/.test(phone)) next.phonenumber = st("phone_invalid");
    setErrors(next);
    if (Object.keys(next).length) {
      document.querySelector(`[data-field="${Object.keys(next)[0]}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }
    return true;
  };

  const postOrder = (bearer: string) =>
    axios.post(
      `${API_BASE_URL}/order`,
      {
        items: cart
          .map((i) => ({ foodId: i.food?.id ?? i.foodId, quantity: Number(i.quantity) || 0, size: i.selectedSize ?? null }))
          .filter((i) => i.foodId && i.quantity > 0),
        totalPrice: total,
        paymentMethod,
        deliveryZone: form.deliveryZone ?? "UB",
        firstName: form.firstName?.trim(),
        lastName: form.lastName?.trim(),
        phone: String(form.phonenumber ?? "").replace(/\s|-/g, ""),
        city: form.city,
        district: form.district,
        khoroo: form.khoroo?.trim(),
        address: form.address?.trim(),
        notes: form.notes?.trim() ?? "",
        idempotencyKey: idempotencyKey.current,
      },
      { headers: { Authorization: `Bearer ${bearer}` }, timeout: 60_000 },
    );

  const placeOrder = async () => {
    if (submitting || !cart.length) return;
    setSubmitError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      let bearer = localStorage.getItem("token") || (await createGuestSession());
      if (!bearer) throw new Error("session");

      let res;
      try {
        res = await postOrder(bearer);
      } catch (err: any) {
        // Stale/invalid stored token: start a fresh guest session and retry once
        if (err?.response?.status !== 401) throw err;
        bearer = await createGuestSession();
        if (!bearer) throw new Error("session");
        res = await postOrder(bearer);
      }

      const orderId = res.data?.orderId ?? res.data?.id;
      if (!orderId) throw new Error("order");

      try {
        localStorage.setItem("lastOrderId", orderId);
      } catch {}
      clearCart();

      router.push(
        paymentMethod === "QPAY"
          ? `/${locale}/checkout/payment-pending?orderId=${orderId}`
          : `/${locale}/checkout/bank-transfer?orderId=${orderId}`,
      );
    } catch (err: any) {
      setSubmitError(err?.message === "session" ? st("err_session") : (err?.response?.data?.message ?? st("err_order")));
      setSubmitting(false);
    }
  };

  return {
    form,
    setForm,
    errors,
    paymentMethod,
    setPaymentMethod,
    productTotal,
    deliveryFee,
    total,
    submitting,
    submitError,
    placeOrder,
  };
}
