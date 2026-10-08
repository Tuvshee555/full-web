"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";

import { CartList } from "./CartList";
import { CartSummary } from "./CartSummary";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import { DELIVERY_FEE } from "@/data/mongoliaLocations";

type CartItem = {
  foodId: string;
  quantity: number;
  selectedSize?: string | null;
  food: {
    id: string;
    foodName: string;
    price: number;
    image: string;
  };
};

const CART_KEY = "cart";

export default function CartStep({ cart }: { cart: CartItem[] }) {
  const router = useRouter();
  const { locale, t } = useI18n();

  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  // load initial cart
  useEffect(() => {
    setItems(cart);
    setLoading(false);
  }, [cart]);

  const persist = (next: CartItem[]) => {
    setItems(next);
    localStorage.setItem(CART_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("cart-updated"));
  };

  const updateQuantity = useCallback(
    (foodId: string, qty: number, selectedSize?: string | null) => {
      const next = items.map((i) =>
        i.foodId === foodId && i.selectedSize === selectedSize
          ? { ...i, quantity: Math.max(1, qty) }
          : i
      );
      persist(next);
    },
    [items]
  );

  const removeItem = useCallback(
    (foodId: string, selectedSize?: string | null) => {
      const next = items.filter(
        (i) => !(i.foodId === foodId && i.selectedSize === selectedSize)
      );
      persist(next);
    },
    [items]
  );

  const clearCart = useCallback(() => {
    persist([]);
  }, []);

  const total = items.reduce((sum, i) => sum + i.food.price * i.quantity, 0);

  if (loading) {
    return <p className="p-10 text-muted-foreground">{t("loading")}</p>;
  }

  return (
    <main
      className="
    min-h-screen
    bg-background
    text-foreground
    pt-0 lg:pt-[110px]
    pb-20
  "
    >
      <div
        className="
          max-w-7xl mx-auto
          grid grid-cols-1
          lg:grid-cols-[1fr_360px]
          gap-8
          items-start
        "
      >
        {/* LEFT – CART ITEMS */}
        <motion.section
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          className="
            bg-background
            rounded-lg
            p-4 sm:p-6
          "
        >
          <div className="flex justify-between items-center mb-6 pb-3">
            <h1 className="text-xl sm:text-2xl font-semibold">
              {t("cart2.yourCart")}
            </h1>

            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="
                  flex items-center gap-1.5
                  text-sm text-muted-foreground
                  hover:text-destructive
                  transition
                "
              >
                <Trash2 className="w-4 h-4" />
                {t("cart2.clear")}
              </button>
            )}
          </div>

          <CartList
            items={items}
            onUpdateQty={updateQuantity}
            onRemove={removeItem}
          />
        </motion.section>

        {/* RIGHT – SUMMARY */}
        <motion.section
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          className="
            bg-background
            rounded-lg
            h-fit
            sticky top-[120px]
          "
        >
          <CartSummary
            total={total}
            delivery={DELIVERY_FEE}
            onCheckout={() => router.push(`/${locale}/checkout?step=info`)}
            onClear={items.length > 0 ? clearCart : undefined}
          />
        </motion.section>
      </div>
    </main>
  );
}
