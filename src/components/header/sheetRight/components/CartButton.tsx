"use client";

import React, { forwardRef } from "react";
import { ShoppingCart } from "lucide-react";
import { motion, MotionProps } from "framer-motion";

type Props = {
  count: number;
} & MotionProps;

export const CartButton = forwardRef<HTMLButtonElement, Props>(
  ({ count, ...motionProps }, ref) => {
    return (
      <motion.button
        ref={ref}
        {...motionProps}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Cart"
        className="
          relative
          flex items-center justify-center
          w-[42px] h-[42px]
          rounded-full
          bg-background
          border border-border
          text-foreground
          transition
          hover:border-primary
          hover:shadow-[0_0_12px_hsl(var(--primary)/0.25)]
          focus:outline-none
        "
      >
        <ShoppingCart className="w-[20px] h-[20px]" strokeWidth={1.8} />

        {count > 0 && (
          <motion.span
            key={count}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 16 }}
            className="
              absolute -top-[6px] -right-[6px]
              min-w-[18px] h-[18px] px-1
              rounded-full
              bg-primary
              text-primary-foreground
              text-[11px] font-bold
              flex items-center justify-center
              leading-none
              shadow-[0_0_10px_hsl(var(--primary)/0.45)]
            "
          >
            {count}
          </motion.span>
        )}
      </motion.button>
    );
  }
);

CartButton.displayName = "CartButton";
