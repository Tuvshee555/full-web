/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import InfoStep from "./components/InfoStep";
import CartStep from "@/components/cartStep/CartStep";
import { useAuth } from "../provider/AuthProvider";
import { useI18n } from "@/components/i18n/ClientI18nProvider";

const CART_KEY = "cart";

function CheckoutInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, t } = useI18n();
  const { token, loading: authLoading } = useAuth();

  const [step, setStep] = useState<"cart" | "info">("cart");
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // sync step with URL
  useEffect(() => {
    const s = searchParams.get("step");
    if (s === "info" || s === "cart") setStep(s);
  }, [searchParams]);

  // load cart from localStorage
  const loadLocalCart = useCallback(() => {
    try {
      const raw = localStorage.getItem(CART_KEY) || "[]";
      const parsed = JSON.parse(raw);
      setCart(Array.isArray(parsed) ? parsed : []);
    } catch {
      setCart([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // auth guard + cart load
  // auth guard + cart load
  useEffect(() => {
    if (authLoading) return;

    if (!token) {
      const fullPath = window.location.pathname + window.location.search;

      router.push(
        `/${locale}/sign-in?redirect=${encodeURIComponent(fullPath)}`
      );

      return;
    }

    loadLocalCart();
  }, [authLoading, token, loadLocalCart, locale, router]);

  // ✅ KEEP PARENT CART UPDATED
  useEffect(() => {
    const handler = () => loadLocalCart();
    window.addEventListener("cart-updated", handler);
    return () => window.removeEventListener("cart-updated", handler);
  }, [loadLocalCart]);

  if (authLoading || loading) {
    return <p className="p-10">{t("loading")}</p>;
  }

  return step === "info" ? <InfoStep cart={cart} /> : <CartStep cart={cart} />;
}

export default function CheckoutPage() {
  const { t } = useI18n();
  return (
    <Suspense fallback={<p className="p-10">{t("loading")}</p>}>
      <CheckoutInner />
    </Suspense>
  );
}
