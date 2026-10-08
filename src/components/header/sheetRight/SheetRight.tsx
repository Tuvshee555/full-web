"use client";

import { ShoppingCart } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CartButton } from "./components/CartButton";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import { PayFood } from "./payfood/PayFood";

export const SheetRight = ({ cartCount }: { cartCount: number }) => {
  const { t } = useI18n();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <CartButton count={cartCount} />
      </SheetTrigger>

      <SheetContent
        className="
    w-[85vw] max-w-none
    sm:max-w-[538px]
    p-8
    bg-card
    text-card-foreground
    border-l border-border
    flex flex-col gap-6
    shadow-2xl
    z-[9999]
  "
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-lg font-semibold text-primary">
            <ShoppingCart className="w-5 h-5" />
            {t("cart.title")}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto mt-2 custom-scrollbar">
          <PayFood />
        </div>
      </SheetContent>
    </Sheet>
  );
};
