"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Check, ChevronLeft, ChevronRight, Info, Minus, Search, X } from "lucide-react";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { cn } from "@admin/lib/utils";

/** Label above, explanation and error below; the input is passed as a render function so it gets the right ids. */
export function Field({
  label,
  hint,
  error,
  optional,
  className,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  optional?: boolean;
  className?: string;
  children: (props: { id: string; "aria-invalid": boolean; "aria-describedby"?: string }) => ReactNode;
}) {
  const { t } = useI18n();
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const described = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="admin-label">
        {label}
        {optional && <span className="ml-[6px] font-normal text-taupe">({t("common.optional")})</span>}
      </label>
      {children({ id, "aria-invalid": Boolean(error), "aria-describedby": described })}
      {error && <p id={errorId} className="admin-error">{error}</p>}
      {hint && <p id={hintId} className="admin-hint">{hint}</p>}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label?: string;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <div className={cn("relative min-w-0", className)}>
      <Search aria-hidden className="pointer-events-none absolute left-[12px] top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-taupe" strokeWidth={1.7} />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label ?? placeholder}
        className="field !pl-[38px] !pr-[40px] [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={t("common.clear_search")}
          className="absolute right-[2px] top-1/2 flex h-[40px] w-[40px] -translate-y-1/2 items-center justify-center text-taupe hover:text-ink"
        >
          <X aria-hidden className="h-[15px] w-[15px]" />
        </button>
      )}
    </div>
  );
}

/** On/off control with its label and explanation. Use for settings, not for actions. */
export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("flex items-start justify-between gap-[16px] py-[12px]", className)}>
      <div className="min-w-0">
        <label htmlFor={id} className="block cursor-pointer text-[14px] font-medium text-ink">{label}</label>
        {description && <p id={`${id}-d`} className="mt-[2px] text-[13px] leading-relaxed text-taupe">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? `${id}-d` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="group relative flex h-[44px] w-[52px] shrink-0 items-center justify-center disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={cn("relative h-[24px] w-[44px] transition-colors", checked ? "bg-ink" : "bg-ink/25")}>
          <span className={cn("absolute top-[3px] h-[18px] w-[18px] bg-white transition-[left]", checked ? "left-[23px]" : "left-[3px]")} />
        </span>
      </button>
    </div>
  );
}

/** Square checkbox with a 44px hit area, for selecting rows. */
export function Checkbox({
  checked,
  indeterminate,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={cn("relative z-[2] flex h-[44px] w-[44px] shrink-0 items-center justify-center", className)}
    >
      <span className={cn("flex h-[18px] w-[18px] items-center justify-center border transition-colors", checked || indeterminate ? "border-ink bg-ink text-paper" : "border-ink/35 bg-white")}>
        {indeterminate ? <Minus aria-hidden className="h-[12px] w-[12px]" strokeWidth={3} /> : checked ? <Check aria-hidden className="h-[12px] w-[12px]" strokeWidth={3} /> : null}
      </span>
    </button>
  );
}

/** A small set of mutually exclusive choices shown side by side (ranges, filters). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: { value: T; label: ReactNode; count?: number }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn("inline-flex max-w-full flex-wrap gap-[4px]", className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex min-h-[40px] items-center gap-[6px] border px-[12px] text-[13px] transition-colors",
              active ? "border-ink bg-ink font-medium text-paper" : "border-ink/20 bg-white text-ink hover:border-ink/50"
            )}
          >
            {option.label}
            {option.count !== undefined && <span className={cn("tabular-nums", active ? "text-paper/75" : "text-taupe")}>{option.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** "Showing 16–30 of 48" with previous/next. Hidden when everything fits on one page. */
export function Pagination({
  page,
  pageSize,
  total,
  onPage,
  disabled,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav aria-label={t("common.pages")} className="flex flex-wrap items-center justify-between gap-[12px] border-t border-ink/10 px-[12px] py-[10px]">
      <p className="text-[13px] tabular-nums text-taupe">{t("common.showing", { from, to, total })}</p>
      <div className="flex items-center gap-[4px]">
        <button type="button" className="btn-secondary btn-sm" disabled={disabled || page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft aria-hidden className="h-[15px] w-[15px]" />
          {t("common.previous")}
        </button>
        <span className="px-[8px] text-[13px] tabular-nums text-taupe">{t("common.page_of", { page, total: pages })}</span>
        <button type="button" className="btn-secondary btn-sm" disabled={disabled || page >= pages} onClick={() => onPage(page + 1)}>
          {t("common.next")}
          <ChevronRight aria-hidden className="h-[15px] w-[15px]" />
        </button>
      </div>
    </nav>
  );
}

/** Appears while rows are selected; holds the actions that apply to all of them. */
export function BulkBar({ count, onClear, children }: { count: number; onClear: () => void; children: ReactNode }) {
  const { t } = useI18n();
  if (!count) return null;
  return (
    <div
      role="region"
      aria-label={t("bulk.region")}
      className="sticky z-[30] mt-[12px] flex flex-wrap items-center gap-[8px] border border-ink bg-espresso px-[12px] py-[10px] text-paper shadow-[0_8px_24px_rgba(28,23,20,0.18)]"
      style={{ bottom: "calc(var(--admin-tabbar) + 12px)" }}
    >
      <p className="mr-auto text-[14px] font-medium tabular-nums" aria-live="polite">{t("bulk.selected", { count })}</p>
      {children}
      <button type="button" onClick={onClear} className="btn-sm inline-flex min-h-[36px] items-center gap-[6px] px-[10px] text-[13px] text-paper/80 hover:text-paper">
        <X aria-hidden className="h-[14px] w-[14px]" />
        {t("bulk.clear")}
      </button>
    </div>
  );
}

/** Buttons inside the dark bulk bar. */
export const bulkButton = "inline-flex min-h-[36px] items-center gap-[6px] bg-paper px-[12px] text-[13px] font-medium text-ink transition-colors hover:bg-sand disabled:opacity-40 [@media(pointer:coarse)]:min-h-[44px]";

/** "?" button that explains a number or setting. Opens on hover, focus or tap. */
export function InfoTip({ text, label, align = "start" }: { text: ReactNode; label?: string; align?: "start" | "end" }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const id = useId();
  const box = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !box.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  return (
    <span ref={box} className="relative inline-flex align-middle" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-label={label ?? t("common.what_is_this")}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        // Opening only (never toggling) keeps a click from closing what focus just opened.
        onClick={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="-m-[15px] flex h-[44px] w-[44px] items-center justify-center text-taupe hover:text-ink"
      >
        <Info aria-hidden className="h-[14px] w-[14px]" strokeWidth={1.8} />
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className={cn(
            "absolute top-[calc(100%+6px)] z-[60] w-[min(260px,calc(100vw-48px))] border border-ink/15 bg-white p-[10px] text-left text-[12px] font-normal leading-relaxed text-ink shadow-[0_8px_24px_rgba(28,23,20,0.12)]",
            align === "end" ? "right-[-10px]" : "left-[-10px]"
          )}
        >
          {text}
        </span>
      )}
    </span>
  );
}
