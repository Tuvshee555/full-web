"use client";

import { motion } from "framer-motion";

export interface FoodActionsProps {
  onAddToCart: () => void | Promise<void>;
  onOrderNow: () => void | Promise<void>;
  isProcessing: boolean;
  addText: string;
  orderText: string;
  primaryClass?: string;
  secondaryClass?: string;
}

export const FoodActions = ({
  onAddToCart,
  onOrderNow,
  isProcessing,
  addText,
  orderText,
}: FoodActionsProps) => {
  return (
    <div className="flex flex-col gap-3 mt-4">
      {/* Primary action — Order Now */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onOrderNow}
        disabled={isProcessing}
        className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-base
          hover:bg-primary/90 transition-colors disabled:opacity-60"
      >
        {orderText}
      </motion.button>

      {/* Secondary action — Add to Cart */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onAddToCart}
        disabled={isProcessing}
        className="w-full py-4 rounded-xl border border-border bg-transparent text-foreground font-semibold text-base
          hover:bg-muted transition-colors disabled:opacity-60"
      >
        {addText}
      </motion.button>
    </div>
  );
};
