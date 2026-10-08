/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import type { FoodCardPropsType } from "@/type/type";
import { fadeUp } from "@/utils/animations";
import { toast } from "sonner";

const BESTSELLER_THRESHOLD = 5;
const CART_KEY = "cart";

export const FoodCard: React.FC<FoodCardPropsType> = ({ food }) => {
  const { locale, t } = useI18n();
  const [hoverIndex, setHoverIndex] = useState(0);

  const price = Number(food.price ?? NaN);
  const oldPrice = Number(food.oldPrice ?? NaN);
  const discount = Number(food.discount ?? NaN);
  const isFeatured = Boolean(food.isFeatured);
  const salesCount = Number(food.salesCount ?? 0);
  const isDiscountFake = Boolean((food as any)?.isDiscountFake);

  const hasDiscount = !Number.isNaN(discount) && discount > 0;
  const showOldPrice = !Number.isNaN(oldPrice) && !Number.isNaN(price) && oldPrice > price;
  const savings = showOldPrice && !Number.isNaN(price) ? Number((oldPrice - price).toFixed(2)) : undefined;

  /* Image handling */
  const displayImages = useMemo(() => {
    const imgs: string[] = [];
    const push = (img?: string | File) => {
      if (!img) return;
      imgs.push(typeof img === "string" ? img : URL.createObjectURL(img));
    };
    push(food.image);
    if (Array.isArray((food as any)?.extraImages)) {
      (food as any).extraImages.forEach((i: any) => push(i));
    }
    return imgs.slice(0, 3);
  }, [food.image, JSON.stringify((food as any)?.extraImages ?? [])]);

  useEffect(() => {
    return () => {
      displayImages.forEach((url) => {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      });
    };
  }, [displayImages]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (displayImages.length <= 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const index = Math.floor(((e.clientX - rect.left) / rect.width) * displayImages.length);
    setHoverIndex(Math.min(displayImages.length - 1, Math.max(0, index)));
  };

  const fmt = (v: number) => (Number.isNaN(v) ? "-" : v.toLocaleString());
  const mainImage = displayImages[hoverIndex] ?? "/placeholder.png";

  const addToCartLocal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const raw = localStorage.getItem(CART_KEY) || "[]";
      const cart: any[] = JSON.parse(raw);
      const index = cart.findIndex((c) => c.foodId === food.id && !c.selectedSize);
      if (index >= 0) {
        cart[index].quantity += 1;
      } else {
        cart.push({
          foodId: food.id,
          quantity: 1,
          selectedSize: null,
          food: {
            id: food.id,
            foodName: food.foodName,
            price: food.price,
            image: typeof food.image === "string" ? food.image : "",
          },
        });
      }
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
      window.dispatchEvent(new Event("cart-updated"));
      toast.success(
        locale === "mn" ? "Амжилттай сагслагдлаа!" : "Successfully added to cart!",
      );
    } catch {
      toast.error(
        locale === "mn"
          ? "Сагслах үед алдаа гарлаа."
          : "Failed to add product to cart.",
      );
    }
  };

  return (
    <Link href={`/${locale}/food/${food.id}`} className="block w-full focus:outline-none">
      <motion.div
        variants={fadeUp}
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
        className="group relative bg-card rounded-2xl overflow-hidden border border-border/60
          hover:border-border hover:shadow-xl hover:shadow-black/5 transition-shadow duration-300 cursor-pointer"
      >
        {/* Image area */}
        <div
          className="relative aspect-[4/3] overflow-hidden bg-muted"
          onMouseLeave={() => setHoverIndex(0)}
          onMouseMove={handleMouseMove}
        >
          <AnimatePresence mode="wait">
            <motion.img
              key={mainImage}
              src={mainImage}
              alt={food.foodName || ""}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              initial={{ opacity: 0.6 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              draggable={false}
            />
          </AnimatePresence>

          {/* Gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent
            opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Badges */}
          <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5">
            {isFeatured && (
              <span className="bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                {t("featured")}
              </span>
            )}
            {!isFeatured && salesCount >= BESTSELLER_THRESHOLD && (
              <span className="bg-muted text-foreground text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-border">
                {t("bestseller")}
              </span>
            )}
            {hasDiscount && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isDiscountFake ? "bg-yellow-400 text-black" : "bg-rose-500 text-white"}`}>
                -{discount}%
              </span>
            )}
          </div>

          {/* Sold out */}
          {(food as any)?.stock === 0 && (
            <div className="absolute inset-0 z-30 bg-black/60 flex items-center justify-center text-white font-semibold">
              {t("sold_out")}
            </div>
          )}

          {/* Quick add button */}
          <button
            className="absolute bottom-3 left-3 right-3 z-20 bg-background/90 backdrop-blur-sm
              text-foreground text-sm font-medium py-2 rounded-xl border border-border/50
              opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0
              transition-all duration-300"
            onClick={addToCartLocal}
          >
            + {t("add_to_cart")}
          </button>
        </div>

        {/* Info area */}
        <div className="p-4">
          <h3 className="font-semibold text-sm leading-tight line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {food.foodName}
          </h3>

          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-base font-bold text-primary">{fmt(price)}₮</span>
              {showOldPrice && (
                <span className="text-xs text-muted-foreground line-through">{fmt(oldPrice)}₮</span>
              )}
            </div>
            {savings && savings > 0 && (
              <span className="text-xs font-medium text-green-500">{t("save")} {fmt(savings)}₮</span>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
};

export default FoodCard;
