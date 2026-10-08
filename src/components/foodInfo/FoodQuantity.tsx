"use client";

import { motion } from "framer-motion";

type FoodQuantityProps = {
  quantity: number;
  setQuantity: (n: number) => void;
  buttonClass?: string;
  valueClass?: string;
};

export const FoodQuantity = ({
  quantity,
  setQuantity,
  buttonClass = "",
  valueClass = "",
}: FoodQuantityProps) => {
  return (
    <div className="flex items-center gap-4 mt-2">
      {/* MINUS */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setQuantity(Math.max(1, quantity - 1))}
        className={`
          ${buttonClass}
        `}
        aria-label="Decrease quantity"
      >
        −
      </motion.button>

      {/* VALUE */}
      <span
        className={`
          ${valueClass}
        `}
      >
        {quantity}
      </span>

      {/* PLUS */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setQuantity(quantity + 1)}
        className={`
          ${buttonClass}
        `}
        aria-label="Increase quantity"
      >
        +
      </motion.button>
    </div>
  );
};
