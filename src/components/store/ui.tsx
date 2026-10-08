/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Minus, Plus, X } from "lucide-react";
import { money, onSale } from "./lib/product";
import { useStoreT } from "./lib/useStoreT";

export const SALE_RED = "#c4302b";
export const CREAM = "#f6f2ed";

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
        <span className="absolute inset-0 overflow-hidden whitespace-nowrap text-[#121212]" style={{ width: `${pct}%` }}>
          {row}
        </span>
      </span>
      {!hideCount && (
        <span className="text-[13px] text-[rgba(18,18,18,0.7)]">
          {showAvg && <span className="mr-[4px] font-semibold text-[#121212]">{avg.toFixed(1)}</span>}({count})
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
export function Price({ product, className = "" }: { product: any; className?: string }) {
  const { st } = useStoreT();
  const sale = onSale(product);
  return (
    <div className={`flex flex-wrap items-baseline gap-x-[8px] ${className}`}>
      {sale && <span className="sr-only">{st("sale_price")}</span>}
      <span className="font-semibold" style={{ color: sale ? SALE_RED : "#121212" }}>
        {money(product.price)}
      </span>
      {sale && (
        <>
          <span className="sr-only">{st("regular_price")}</span>
          <s className="text-[0.88em] text-[rgba(18,18,18,0.5)]">{money(product.oldPrice)}</s>
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
        ? { background: "#fff", color: "#121212" }
        : { background: "#fff", color: "#121212", boxShadow: "inset 0 0 0 1px #121212" };
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
  const h = small ? "h-[40px]" : "h-[45px]";
  return (
    <div className={`inline-flex items-center ${h} w-[140px] shadow-[0_0_0_1px_rgba(18,18,18,0.55)]`}>
      <button
        type="button"
        aria-label={st("decrease")}
        className="flex h-full w-[45px] items-center justify-center text-[#121212] disabled:opacity-30"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
      >
        <Minus className="h-[12px] w-[12px]" strokeWidth={2} />
      </button>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        min={min}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          if (!Number.isNaN(n)) onChange(Math.max(min, n));
        }}
        className="h-full w-[50px] flex-1 bg-transparent text-center text-[15px] text-[#121212] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        aria-label={st("quantity")}
      />
      <button
        type="button"
        aria-label={st("increase")}
        className="flex h-full w-[45px] items-center justify-center text-[#121212]"
        onClick={() => onChange(value + 1)}
      >
        <Plus className="h-[12px] w-[12px]" strokeWidth={2} />
      </button>
    </div>
  );
}

/** Slide-in panel with overlay (cart drawer, menu drawer, filter drawer). */
export function Drawer({
  open,
  onClose,
  side = "right",
  title,
  children,
  widthClass = "w-[400px]",
}: {
  open: boolean;
  onClose: () => void;
  side?: "left" | "right";
  title?: ReactNode;
  children: ReactNode;
  widthClass?: string;
}) {
  const { st } = useStoreT();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className={`fixed inset-0 z-[1000] ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-[rgba(18,18,18,0.5)] transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`absolute top-0 bottom-0 ${side === "right" ? "right-0" : "left-0"} ${widthClass} max-w-[calc(100vw-30px)]
          bg-white flex flex-col transition-transform duration-300 ease-out
          ${open ? "translate-x-0" : side === "right" ? "translate-x-full" : "-translate-x-full"}`}
      >
        {title !== undefined && (
          <div className="flex items-center justify-between px-[20px] md:px-[30px] pt-[25px] pb-[15px]">
            <h2 className="store-heading text-[21px]">{title}</h2>
            <button type="button" aria-label={st("close")} onClick={onClose} className="-mr-[10px] p-[10px] text-[#121212]">
              <X className="h-[20px] w-[20px]" strokeWidth={1.5} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
