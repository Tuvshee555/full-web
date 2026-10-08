/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import React, { useEffect, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import type { FoodCardPropsType } from "@/type/type";
import { fadeUp } from "@/utils/animations";
import { toast } from "sonner";

const BESTSELLER_THRESHOLD = 5;
const CART_KEY = "cart";

export const FoodCard: React.FC<FoodCardPropsType> = ({ food }) => {
  const { locale, t } = useI18n();

  const price = Number(food.price ?? NaN);
  const oldPrice = Number(food.oldPrice ?? NaN);
  const discount = Number(food.discount ?? NaN);
  const isFeatured = Boolean(food.isFeatured);
  const salesCount = Number(food.salesCount ?? 0);
  const isDiscountFake = Boolean((food as any)?.isDiscountFake);

  const hasDiscount = !Number.isNaN(discount) && discount > 0;
  const showOldPrice = !Number.isNaN(oldPrice) && !Number.isNaN(price) && oldPrice > price;

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

  const fmt = (v: number) => (Number.isNaN(v) ? "-" : v.toLocaleString());
  const mainImage = displayImages[0] ?? "/placeholder.png";
  // Second photo crossfades in on hover (desktop only, like most fashion/beauty stores)
  const hoverImage = displayImages[1];

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
      <motion.div variants={fadeUp} className="group relative bg-transparent cursor-pointer">
        {/* Image area: square, sharp edges */}
        <div className="relative aspect-square overflow-hidden bg-muted">
          <img
            src={mainImage}
            alt={food.foodName || ""}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500
              ${hoverImage ? "md:group-hover:opacity-0" : ""}`}
            draggable={false}
          />
          {hoverImage && (
            <img
              src={hoverImage}
              alt=""
              aria-hidden
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-500
                hidden md:block md:group-hover:opacity-100"
              draggable={false}
            />
          )}

          {/* Badges */}
          <div className="absolute top-2 left-2 z-20 flex flex-col items-start gap-1">
            {isFeatured && (
              <span className="bg-foreground text-background text-[10px] font-semibold uppercase tracking-widest px-2 py-1">
                {t("featured")}
              </span>
            )}
            {!isFeatured && salesCount >= BESTSELLER_THRESHOLD && (
              <span className="bg-background text-foreground text-[10px] font-semibold uppercase tracking-widest px-2 py-1">
                {t("bestseller")}
              </span>
            )}
            {hasDiscount && (
              <span className={`text-[10px] font-semibold tracking-wider px-2 py-1 ${isDiscountFake ? "bg-yellow-400 text-black" : "bg-rose-600 text-white"}`}>
                -{discount}%
              </span>
            )}
          </div>

          {/* Sold out */}
          {(food as any)?.stock === 0 && (
            <div className="absolute inset-0 z-30 bg-background/70 flex items-center justify-center text-foreground text-xs font-semibold uppercase tracking-widest">
              {t("sold_out")}
            </div>
          )}

          {/* Quick add bar: slides up on hover (desktop) */}
          <button
            className="absolute bottom-0 inset-x-0 z-20 hidden md:block bg-foreground text-background
              text-xs font-semibold uppercase tracking-widest py-3
              translate-y-full group-hover:translate-y-0 transition-transform duration-300"
            onClick={addToCartLocal}
          >
            {t("add_to_cart")}
          </button>
        </div>

        {/* Info area */}
        <div className="pt-3">
          <h3 className="text-sm font-medium leading-snug line-clamp-2 mb-1">
            {food.foodName}
          </h3>

          <div className="flex items-baseline gap-2">
            <span className={`text-sm font-semibold ${showOldPrice ? "text-rose-600" : "text-foreground"}`}>
              {fmt(price)}₮
            </span>
            {showOldPrice && (
              <span className="text-xs text-muted-foreground line-through">{fmt(oldPrice)}₮</span>
            )}
          </div>

          {/* Mobile has no hover, so the add button is always visible there */}
          <button
            className="md:hidden mt-2 w-full border border-foreground text-foreground text-[11px] font-semibold
              uppercase tracking-widest py-2 active:bg-foreground active:text-background"
            onClick={addToCartLocal}
          >
            {t("add_to_cart")}
          </button>
        </div>
      </motion.div>
    </Link>
  );
};

export default FoodCard;
