/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { Package } from "lucide-react";
import { FoodTitle } from "./FoodTitle";
import { FoodSizes } from "./FoodSizes";
import { FoodQuantity } from "./FoodQuantity";
import { FoodActions } from "./FoodActions";

import { resolveImageUrl } from "./utils/resolveImageUrl";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import { getDefaultClothingSizes } from "@/utils/catalogSanitizer";

type LocalCartItem = {
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

const addToCartLocal = (item: LocalCartItem): boolean => {
  try {
    const raw = localStorage.getItem(CART_KEY) || "[]";
    const cart: LocalCartItem[] = JSON.parse(raw);

    const index = cart.findIndex(
      (c) => c.foodId === item.foodId && c.selectedSize === item.selectedSize,
    );

    if (index >= 0) {
      cart[index].quantity += item.quantity;
    } else {
      cart.push(item);
    }

    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    window.dispatchEvent(new Event("cart-updated"));
    return true;
  } catch {
    return false;
  }
};

const BESTSELLER_THRESHOLD = 20;

const formatCount = (n: number) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
};

const Stars = ({ value }: { value: number }) => {
  const full = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <div className="flex items-center gap-1 leading-none">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={
            i < full
              ? "text-yellow-500 text-sm"
              : "text-muted-foreground text-sm"
          }
        >
          ★
        </span>
      ))}
    </div>
  );
};

export const FoodInfo = ({ food }: { food: any }) => {
  const router = useRouter();
  const { locale, t } = useI18n();
  const actionsRef = useRef<HTMLDivElement | null>(null);

  const isFeatured = Boolean(food.isFeatured);
  const salesCount = Number(food.salesCount ?? 0);
  const discount = Number(food.discount ?? 0);
  const hasDiscount = discount > 0;

  const avgRating = Number(food.avgRating ?? 0);
  const reviewCount = Number(food.reviewCount ?? 0);

  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);

  const effectiveSizes =
    Array.isArray(food.sizes) && food.sizes.length > 0
      ? food.sizes
      : getDefaultClothingSizes();
  const stickyThumbnail = resolveImageUrl(food.image);

  useEffect(() => {
    const target = actionsRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyBar(!entry.isIntersecting);
      },
      { threshold: 0.4 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const buildCartItem = (): LocalCartItem => ({
    foodId: food.id,
    quantity,
    selectedSize,
    food: {
      id: food.id,
      foodName: food.foodName,
      price: food.price,
      image: resolveImageUrl(food.image),
    },
  });

  const handleAddToCart = () => {
    if (isProcessing) return;
    setIsProcessing(true);

    const ok = addToCartLocal(buildCartItem());
    if (ok) {
      toast.success(
        locale === "mn" ? "Амжилттай сагслагдлаа!" : "Successfully added to cart!",
      );
    } else {
      toast.error(
        locale === "mn"
          ? "Сагслах үед алдаа гарлаа."
          : "Failed to add product to cart.",
      );
    }

    setIsProcessing(false);
  };

  const handleOrderNow = () => {
    if (isProcessing) return;
    setIsProcessing(true);

    const ok = addToCartLocal(buildCartItem());
    if (!ok) {
      setIsProcessing(false);
      return;
    }

    router.push(`/${locale}/checkout`);
    setIsProcessing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col min-h-full gap-5 text-foreground"
    >
      <FoodTitle
        name={food.foodName}
        price={food.price}
        oldPrice={food.oldPrice}
      />

      {/* ✅ Rating + Bought count (Vitals style) */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {reviewCount > 0 ? (
          <div className="flex items-center gap-2">
            <Stars value={avgRating} />
            <span className="font-medium text-foreground">
              {avgRating.toFixed(1)}
            </span>
            <span>
              ({reviewCount} {t("reviews") ?? "reviews"})
            </span>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">
            {t("no_reviews") ?? "No reviews yet"}
          </div>
        )}

        <span className="hidden sm:inline">•</span>

        {salesCount > 0 && (
          <div className="flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5" />
            <span>{formatCount(salesCount)} {t("sold") ?? "sold"}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center text-xs font-semibold px-2 py-1 rounded-sm bg-emerald-600 text-white">
          {locale === "mn" ? "Хүргэлттэй" : "Delivery available"}
        </span>

        {isFeatured && (
          <span className="inline-flex items-center text-xs font-semibold px-2 py-1 rounded-sm bg-red-600 text-white">
            {t("featured")}
          </span>
        )}

        {!isFeatured && salesCount >= BESTSELLER_THRESHOLD && (
          <span className="inline-flex items-center text-xs font-semibold px-2 py-1 rounded-sm bg-muted text-foreground border border-border">
            {t("bestseller")}
          </span>
        )}

        {hasDiscount && (
          <span className="inline-flex items-center text-xs font-semibold px-2 py-1 rounded-sm bg-yellow-500 text-black">
            -{discount}%
          </span>
        )}
      </div>

      {food.ingredients && (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {food.ingredients}
        </p>
      )}

      <FoodSizes
        sizes={effectiveSizes}
        selectedSize={selectedSize}
        setSelectedSize={setSelectedSize}
      />

      <FoodQuantity
        quantity={quantity}
        setQuantity={setQuantity}
        buttonClass="
          w-8 h-8
          flex items-center justify-center
          rounded-md
          bg-muted
          text-foreground
        "
        valueClass="
          min-w-[28px]
          text-center
          font-medium
          text-foreground
        "
      />

      <div className="mt-auto" ref={actionsRef}>
        <FoodActions
          onAddToCart={handleAddToCart}
          onOrderNow={handleOrderNow}
          isProcessing={isProcessing}
          addText={t("add_to_cart")}
          orderText={t("order_now")}
        />
      </div>

      {showStickyBar && (
        <div className="fixed bottom-0 left-0 right-0 z-50 w-full border-t border-white/10 bg-[#111] text-white p-3">
          <div className="mx-auto max-w-7xl flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex items-center gap-3">
              <img
                src={stickyThumbnail}
                alt={food.foodName}
                className="h-10 w-10 rounded object-cover border border-white/10 bg-[#1a1a1a]"
              />
              <div className="min-w-0">
                <p className="text-xs text-white/70 truncate">{food.foodName}</p>
                <p className="font-semibold">{Number(food.price ?? 0).toLocaleString()}₮</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2 rounded-md border border-white/15 px-2 py-1">
                <button
                  type="button"
                  className="h-7 w-7 rounded hover:bg-white/10"
                  onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                >
                  -
                </button>
                <span className="min-w-[24px] text-center text-sm">{quantity}</span>
                <button
                  type="button"
                  className="h-7 w-7 rounded hover:bg-white/10"
                  onClick={() => setQuantity((prev) => prev + 1)}
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                className="h-[40px] rounded-md border border-white/20 bg-transparent px-3 text-sm font-medium text-white hover:bg-white/10"
              >
                {t("add_to_cart")}
              </button>
              <button
                type="button"
                onClick={handleOrderNow}
                className="h-[40px] rounded-md bg-white px-3 text-sm font-semibold text-black"
              >
                {t("order_now")}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
