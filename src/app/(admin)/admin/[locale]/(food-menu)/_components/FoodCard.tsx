/* eslint-disable @next/next/no-img-element */
"use client";

import { FoodCardPropsType } from "@admin/type/type";
import UpdateFoodButton from "./updateFood/UpdateFoodButton";
import { useEffect, useMemo } from "react";

export const FoodCard: React.FC<FoodCardPropsType> = ({
  food,
  refreshFood,
  category,
}) => {

  const imgSrc = useMemo(() => {
    if (!food.image) return null;

    if (typeof food.image === "string") {
      const trimmed = food.image.trim();
      return trimmed.length > 0 ? trimmed : null;
    }

    return URL.createObjectURL(food.image);
  }, [food.image]);

  useEffect(() => {
    if (imgSrc && typeof food.image !== "string") {
      return () => URL.revokeObjectURL(imgSrc);
    }
  }, [imgSrc, food.image]);

  return (
    <div
      className="
        group
        bg-card
        text-foreground
        ring-1 ring-border
        rounded-none
        overflow-hidden
        flex flex-col
        w-full
      "
    >
      <div className="relative w-full aspect-square">
        {imgSrc ? (
          <img
            src={imgSrc}
            className="w-full h-full object-cover"
            alt={food.foodName}
          />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}

        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <UpdateFoodButton
            food={food}
            refreshFood={refreshFood}
            category={category}
          />
        </div>
      </div>

      <div className="p-3 space-y-0.5">
        <h3 className="text-sm font-semibold line-clamp-1">{food.foodName}</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-primary">{food.price}₮</span>
          {food.oldPrice && food.oldPrice !== food.price && (
            <span className="text-xs text-muted-foreground line-through">
              {food.oldPrice}₮
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
