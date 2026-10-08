/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { API_BASE_URL } from "@/lib/api";
import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import { useAuth } from "@/app/(customer)/[locale]/provider/AuthProvider";
import {
  DELIVERY_FEE,
  DeliveryZone,
  ULAANBAATAR_DISTRICTS,
} from "@/data/mongoliaLocations";

/** CANONICAL (match backend) */
export type PaymentMethod = "QPAY" | "BANK" | "COD" | "LEMON" | null;

export type CartItem = {
  foodId?: string;
  quantity: number;
  selectedSize?: string | null;
  food?: {
    id?: string;
    price?: number;
  };
};

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

const CART_KEY = "cart";

export function useCheckout(cart: CartItem[]) {
  const router = useRouter();
  const { userId, token } = useAuth();
  const { locale, t } = useI18n();

  const [form, setForm] = useState<DeliveryFormData>({
    deliveryZone: "UB",
    city: "Улаанбаатар",
    district: ULAANBAATAR_DISTRICTS[0],
  });
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [openTerms, setOpenTerms] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  // NEW: submission lock
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* use backend enum everywhere */
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);

  const productTotal = useMemo(
    () => cart.reduce((s, i) => s + (i.food?.price ?? 0) * i.quantity, 0),
    [cart]
  );

  const deliveryFee = DELIVERY_FEE;
  const totalPrice = productTotal + deliveryFee;

  const initialLoadRef = useRef(true);
  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!userId || !token) return;

    initialLoadRef.current = true;

    axios
      .get(`${API_BASE_URL}/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        if (res.data?.user) {
          setForm({
            deliveryZone:
              res.data.user.deliveryZone === "RURAL" ? "RURAL" : "UB",
            firstName: res.data.user.firstName ?? "",
            lastName: res.data.user.lastName ?? "",
            phonenumber: res.data.user.phonenumber ?? "",
            city: res.data.user.city ?? "Улаанбаатар",
            district: res.data.user.district ?? ULAANBAATAR_DISTRICTS[0],
            khoroo: res.data.user.khoroo ?? "",
            address: res.data.user.address ?? "",
            notes: res.data.user.notes ?? "",
          });
        }
      })
      .catch(() => toast.error(t("err_user_info")))
      .finally(() => {
        initialLoadRef.current = false;
      });
  }, [userId, token, t]);

  useEffect(() => {
    if (!userId || !token || initialLoadRef.current) return;

    const hasAny = Object.values(form).some(
      (v) => typeof v === "string" && v.trim()
    );
    if (!hasAny) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = window.setTimeout(async () => {
      try {
        await axios.put(
          `${API_BASE_URL}/user/${userId}`,
          {
            deliveryZone: form.deliveryZone ?? "UB",
            firstName: form.firstName ?? "",
            lastName: form.lastName ?? "",
            phonenumber: form.phonenumber ?? "",
            city: form.city ?? "",
            district: form.district ?? "",
            khoroo: form.khoroo ?? "",
            address: form.address ?? "",
            notes: form.notes ?? "",
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch {
        toast.error(t("profile_save_error"));
      } finally {
        saveTimerRef.current = null;
      }
    }, 800);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [form, userId, token, t]);

  const handleSubmit = (newErrors: Record<string, boolean>) => {
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      toast.error(t("err_fill_required"));
      return;
    }
    if (!paymentMethod) {
      toast.error(t("choose_payment_method"));
      return;
    }
    setOpenTerms(true);
  };

  // create idempotency key (UUID fallback)
  const createIdempotencyKey = () => {
    try {
      // modern browsers
      // @ts-ignore
      if (globalThis?.crypto?.randomUUID) return globalThis.crypto.randomUUID();
      // fallback
      return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    } catch {
      return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    }
  };

  const handlePaymentStart = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      // ✅ don’t close terms dialog yet (prevents clicking order again)
      if (!cart.length) {
        toast.error(t("cart_empty"));
        setIsSubmitting(false);
        return;
      }

      if (!token) {
        router.push(`/${locale}/log-in`);
        setIsSubmitting(false);
        return;
      }

      const normalizedItems = cart
        .map((i) => ({
          foodId: i.food?.id ?? i.foodId ?? null,
          quantity: Number(i.quantity) || 0,
          size: i.selectedSize ?? null,
        }))
        .filter((i) => i.foodId && i.quantity > 0);

      if (!normalizedItems.length) {
        toast.error(t("err_invalid_cart_items"));
        setIsSubmitting(false);
        return;
      }

      if (!paymentMethod) {
        toast.error(t("choose_payment_method"));
        setIsSubmitting(false);
        return;
      }

      const idempotencyKey = createIdempotencyKey();

      const res = await axios.post(
        `${API_BASE_URL}/order`,
        {
          items: normalizedItems,
          totalPrice,
          paymentMethod,
          deliveryZone: form.deliveryZone ?? "UB",
          firstName: form.firstName ?? null,
          lastName: form.lastName ?? null,
          phone: form.phonenumber ?? null,
          city: form.city ?? null,
          district: form.district ?? null,
          khoroo: form.khoroo ?? null,
          address: form.address ?? null,
          notes: form.notes ?? "",
          idempotencyKey,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 60_000,
        }
      );

      const order = res.data ?? {};
      // backend sometimes returns order.id or order.orderId - handle both
      const returnedOrderId =
        order.id ?? order.orderId ?? order.orderId ?? null;

      if (!returnedOrderId) {
        toast.error(t("err_create_order"));
        setIsSubmitting(false);
        return;
      }

      // If Lemon flow, create checkout and redirect to Lemon
      if (paymentMethod === "LEMON") {
        // make redirect back to your frontend success page
        const redirectUrl = `${window.location.origin}/${locale}/profile/orders/${returnedOrderId}`;

        // Prefer raw string env (NEXT_PUBLIC is required for client)
        const variantFromEnv =
          process.env.NEXT_PUBLIC_LEMON_VARIANT_ID ?? undefined;

        console.log("LEMON flow: variantFromEnv:", variantFromEnv);
        if (!variantFromEnv) {
          toast.error(
            t("payment.lemon_variant_missing") ||
              "LEMON variant id missing. Contact admin."
          );

          // store lastOrderId then route to order detail as fallback
          setOpenTerms(false);
          localStorage.removeItem(CART_KEY);
          try {
            localStorage.setItem("lastOrderId", returnedOrderId);
          } catch {}
          setOrderId(returnedOrderId);
          router.push(`/${locale}/profile/orders/${returnedOrderId}`);
          setIsSubmitting(false);
          return;
        }

        try {
          console.log("Calling backend /payment/lemon/checkout", {
            orderId: returnedOrderId,
            variantId: variantFromEnv,
            redirectUrl,
          });

          const lemonRes = await axios.post(
            `${API_BASE_URL}/payment/lemon/checkout`,
            {
              orderId: returnedOrderId,
              variantId: variantFromEnv,
              redirectUrl,
            },
            { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 }
          );

          console.log("LEMON checkout response:", lemonRes?.data);

          const data = lemonRes.data ?? {};
          // try multiple possible keys (checkoutUrl, checkout_url, data.data.attributes.url)
          const checkoutUrl =
            data.checkoutUrl ??
            data.checkout_url ??
            (data.data && data.data.attributes && data.data.attributes.url) ??
            (data.data &&
              data.data.attributes &&
              data.data.attributes.checkout_url) ??
            null;

          if (!checkoutUrl) {
            console.error(
              "No checkoutUrl found in lemon response",
              lemonRes.data
            );
            throw new Error("no checkout url");
          }

          // close terms, clear cart, store last order id
          setOpenTerms(false);
          localStorage.removeItem(CART_KEY);
          try {
            localStorage.setItem("lastOrderId", returnedOrderId);
          } catch {}
          window.dispatchEvent(new Event("cart-updated"));
          setOrderId(returnedOrderId);

          // hard redirect to Lemon checkout (use location.assign)
          window.location.assign(checkoutUrl);
          // NOTE: return so function ends here (redirect happening)
          return;
        } catch (err: any) {
          console.error("LEMON checkout error:", err?.response?.data || err);
          toast.error(
            t("err_create_lemon_checkout") ||
              "Failed to start payment — try again"
          );

          // fallback: route to order detail so user can retry (but keep lastOrderId)
          setOpenTerms(false);
          localStorage.removeItem(CART_KEY);
          try {
            localStorage.setItem("lastOrderId", returnedOrderId);
          } catch {}
          setOrderId(returnedOrderId);
          router.push(`/${locale}/profile/orders/${returnedOrderId}`);
          setIsSubmitting(false);
          return;
        }
      }

      // non-LEMON flows:
      // close terms
      setOpenTerms(false);

      // clear cart
      localStorage.removeItem(CART_KEY);
      window.dispatchEvent(new Event("cart-updated"));

      setOrderId(returnedOrderId);
      try {
        localStorage.setItem("lastOrderId", returnedOrderId);
      } catch {}

      if (paymentMethod === "QPAY") {
        router.push(
          `/${locale}/checkout/payment-pending?orderId=${returnedOrderId}`
        );
        setIsSubmitting(false);
        return;
      }

      if (paymentMethod === "BANK") {
        router.push(
          `/${locale}/checkout/bank-transfer?orderId=${returnedOrderId}`
        );
        setIsSubmitting(false);
        return;
      }

      toast.success(t("order_success"));
      router.push(`/${locale}/profile/orders/${returnedOrderId}`);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        router.push(`/${locale}/log-in`);
        setIsSubmitting(false);
        return;
      }
      console.error("handlePaymentStart error:", err?.response?.data || err);
      toast.error(t("err_create_order"));
    } finally {
      // ✅ only reset after request finishes if we didn't redirect away
      setIsSubmitting(false);
    }
  };

  return {
    form,
    setForm,
    errors,
    openTerms,
    setOpenTerms,
    orderId,
    paymentMethod,
    setPaymentMethod,
    productTotal,
    deliveryFee,
    totalPrice,
    handleSubmit,
    handlePaymentStart,
    isSubmitting, // expose loading flag for UI
    t,
    router,
  };
}
