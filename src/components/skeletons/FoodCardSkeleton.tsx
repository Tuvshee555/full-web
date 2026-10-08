"use client";

export const FoodCardSkeleton = () => {
  return (
    <div className="animate-pulse space-y-2">
      <div className="aspect-square w-full bg-muted" />
      <div className="h-4 w-3/4 bg-muted" />
      <div className="h-4 w-1/3 bg-muted" />
    </div>
  );
};
