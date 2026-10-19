/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useRef, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Minus, Plus, X } from "lucide-react";
import { money, onSale, ownSizePrice, priceRange, sizeLabel, sizePrice } from "./lib/product";
import { useStoreT } from "./lib/useStoreT";

export const SALE_RED = "#a8452f";
export const CREAM = "#efe7dd";

/** ★★★★★ 4.8 (120): only rendered when there are real reviews. */
export function Stars({
  avg,
  count,
  size = 14,
  showAvg = false,
  hideCount = false,
  className = "",
}: {
  avg: number;
  count: number;
  size?: number;
  showAvg?: boolean;
  hideCount?: boolean;
  className?: string;
}) {
  if (!count) return null;
  const pct = Math.max(0, Math.min(100, (avg / 5) * 100));
  const row = "★★★★★";
  return (
    <span className={`inline-flex items-center gap-[6px] ${className}`} aria-label={`${avg.toFixed(1)} / 5 (${count})`}>
      <span className="relative inline-block leading-none" style={{ fontSize: size }}>
        <span className="text-[#d9d4cf]">{row}</span>
        <span className="absolute inset-0 overflow-hidden whitespace-nowrap text-[#1c1714]" style={{ width: `${pct}%` }}>
          {row}
        </span>
      </span>
      {!hideCount && (
        <span className="text-[13px] text-[rgba(28,23,20,0.7)]">
          {showAvg && <span className="mr-[4px] font-semibold text-[#1c1714]">{avg.toFixed(1)}</span>}({count})
        </span>
      )}
    </span>
  );
}

/** Dashed "fill this in" box, only in `npm run dev`. Never shown to customers. */
export function DevHint({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV !== "development") return null;
  return (
    <div className="border border-dashed border-[#c9a96e] bg-[#fffaf0] px-[14px] py-[10px] text-[13px] text-[#7a5b1f]">
      <b>DEV:</b> {children}
    </div>
  );
}

/** Price, sale price in red, compare-at struck through after it. */
export function Price({ product, size, className = "" }: { product: any; size?: string | null; className?: string }) {
  const { st } = useStoreT();
  const range = priceRange(product);
  const own = size !== undefined ? ownSizePrice((product?.sizes ?? []).find((s: any) => sizeLabel(s) === size)) : null;
  const varies = size === undefined && range.min !== range.max;
  // The compare-at price belongs to the product price, so it only shows when that is the price on screen.
  const sale = onSale(product) && own === null && !varies;
  const shown = size !== undefined ? sizePrice(product, size) : varies ? range.min : Number(product.price);
  return (
    <div className={`flex flex-wrap items-baseline gap-x-[8px] ${className}`}>
      {sale && <span className="sr-only">{st("sale_price")}</span>}
      <span className="font-semibold" style={{ color: sale ? SALE_RED : "#1c1714" }}>
        {varies ? st("from_price", { price: money(shown) }) : money(shown)}
      </span>
      {sale && (
        <>
          <span className="sr-only">{st("regular_price")}</span>
          <s className="text-[0.88em] text-taupe">{money(product.oldPrice)}</s>
        </>
      )}
    </div>
  );
}

/** "-16%" from the real compare-at price. */
export const salePercent = (p: any) => {
  const price = Number(p?.price);
  const compare = Number(p?.oldPrice);
  return compare > price ? Math.round(((compare - price) / compare) * 100) : 0;
};

export function Badge({ kind, children }: { kind: "sale" | "soldout" | "label"; children: ReactNode }) {
  const style =
    kind === "sale"
      ? { background: SALE_RED, color: "#fff" }
      : kind === "label"
        ? { background: "#fff", color: "#1c1714" }
        : { background: "#fff", color: "#1c1714", boxShadow: "inset 0 0 0 1px #1c1714" };
  return (
    <span className="inline-block px-[8px] py-[4px] text-[12px] font-semibold leading-none" style={style}>
      {children}
    </span>
  );
}

export function QuantityInput({
  value,
  onChange,
  min = 1,
  small = false,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  small?: boolean;
}) {
  const { st } = useStoreT();
  const h = small ? "h-[44px]" : "h-[52px]";
  return (
    <div className={`inline-flex items-center ${h} w-[140px] shadow-[inset_0_0_0_1px_rgba(28,23,20,0.25)]`}>
      <button
        type="button"
        aria-label={st("decrease")}
        className="flex h-full w-[45px] shrink-0 items-center justify-center text-[#1c1714] disabled:opacity-30"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
      >
        <Minus className="h-[12px] w-[12px]" strokeWidth={1.4} />
      </button>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        min={min}
        max={999}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isSafeInteger(n)) onChange(Math.min(999, Math.max(min, n)));
        }}
        className="h-full w-[50px] flex-1 bg-transparent text-center text-[15px] text-[#1c1714] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        aria-label={st("quantity")}
      />
      <button
        type="button"
        aria-label={st("increase")}
        disabled={value >= 999}
        className="flex h-full w-[45px] shrink-0 items-center justify-center text-[#1c1714]"
        onClick={() => onChange(Math.min(999, value + 1))}
      >
        <Plus className="h-[12px] w-[12px]" strokeWidth={1.4} />
      </button>
    </div>
  );
}

/** Shared accessible drawer: focus trap, Escape, scroll lock and focus restoration. */
export function Drawer({ open, onClose, side = "right", title, children, widthClass = "w-[440px]" }: {
  open: boolean;
  onClose: () => void;
  side?: "left" | "right";
  title?: ReactNode;
  children: ReactNode;
  widthClass?: string;
}) {
  const { st } = useStoreT();
  const returnFocus = useRef<HTMLElement | null>(null);
  return (
    <Dialog.Root open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-overlay bg-espresso/40 data-[state=open]:animate-in data-[state=open]:fade-in duration-200" />
        <Dialog.Content onOpenAutoFocus={() => { returnFocus.current = document.activeElement as HTMLElement; }} onCloseAutoFocus={(event) => { event.preventDefault(); returnFocus.current?.focus(); }} aria-describedby={undefined} className={`fixed inset-y-0 z-overlay flex max-w-full flex-col bg-paper pb-[env(safe-area-inset-bottom)] shadow-xl outline-none ${widthClass} ${side === "right" ? "right-0 data-[state=open]:slide-in-from-right" : "left-0 data-[state=open]:slide-in-from-left"} data-[state=open]:animate-in duration-200`}>
          <div className="flex items-center justify-between gap-[12px] border-b border-ink/10 px-[20px] py-[16px] sm:px-[28px]">
            <Dialog.Title className="text-[20px] font-medium text-ink">{title ?? st("menu")}</Dialog.Title>
            <Dialog.Close aria-label={st("close")} className="-mr-[10px] flex h-[44px] w-[44px] shrink-0 items-center justify-center text-ink hover:bg-sand"><X className="h-[20px] w-[20px]" strokeWidth={1.5} /></Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
