"use client";

export const FoodCardSkeleton = () => {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-card p-3 space-y-3">
      <div className="h-36 w-full rounded-md bg-muted" />
      <div className="h-4 w-3/4 rounded bg-muted" />
      <div className="h-4 w-1/2 rounded bg-muted" />
    </div>
  );
};
