"use client";

import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, Loader2, RefreshCw, type LucideIcon } from "lucide-react";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { cn } from "@admin/lib/utils";
import { Skeleton } from "./skeleton";

/** Nothing to show yet: say why, and what to do next. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-[20px] py-[48px] text-center", className)}>
      {Icon && (
        <span className="mb-[14px] flex h-[48px] w-[48px] items-center justify-center bg-sand text-taupe">
          <Icon aria-hidden className="h-[22px] w-[22px]" strokeWidth={1.5} />
        </span>
      )}
      <p className="text-[15px] font-medium text-ink">{title}</p>
      {description && <p className="mt-[6px] max-w-[46ch] text-[13px] leading-relaxed text-taupe">{description}</p>}
      {action && <div className="mt-[16px] flex flex-wrap justify-center gap-[8px]">{action}</div>}
    </div>
  );
}

/** Something failed to load. Always offers a way to try again. */
export function ErrorState({
  message,
  onRetry,
  retrying,
  className,
}: {
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <div role="alert" className={cn("flex flex-wrap items-center justify-between gap-[12px] border border-terracotta/30 bg-white p-[14px]", className)}>
      <p className="flex min-w-0 items-start gap-[10px] text-[14px] text-ink">
        <AlertTriangle aria-hidden className="mt-[2px] h-[16px] w-[16px] shrink-0 text-terracotta" strokeWidth={1.8} />
        <span>{message}</span>
      </p>
      {onRetry && (
        <button type="button" className="btn-secondary btn-sm" onClick={onRetry} disabled={retrying}>
          <RefreshCw aria-hidden className={cn("h-[14px] w-[14px]", retrying && "animate-spin")} />
          {t("common.retry")}
        </button>
      )}
    </div>
  );
}

const NOTICE: Record<"info" | "warning" | "success", { icon: LucideIcon; box: string; icon_: string }> = {
  info: { icon: Info, box: "border-ink/15 bg-paper", icon_: "text-taupe" },
  warning: { icon: AlertTriangle, box: "border-terracotta/35 bg-terracotta/[0.04]", icon_: "text-terracotta" },
  success: { icon: CheckCircle2, box: "border-[#5b6b4b]/30 bg-[#5b6b4b]/[0.06]", icon_: "text-[#3d4a34]" },
};

/** A short explanation or warning inside a page. */
export function Notice({
  tone = "info",
  title,
  children,
  action,
  className,
  role,
}: {
  tone?: "info" | "warning" | "success";
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
  role?: "status" | "alert";
}) {
  const { icon: Icon, box, icon_ } = NOTICE[tone];
  return (
    <div role={role} className={cn("flex flex-wrap items-start justify-between gap-[12px] border px-[14px] py-[12px]", box, className)}>
      <div className="flex min-w-0 flex-1 items-start gap-[10px]">
        <Icon aria-hidden className={cn("mt-[2px] h-[16px] w-[16px] shrink-0", icon_)} strokeWidth={1.8} />
        <div className="min-w-0 text-[13px] leading-relaxed text-ink">
          {title && <p className="font-medium">{title}</p>}
          {children && <div className={title ? "mt-[2px] text-taupe" : ""}>{children}</div>}
        </div>
      </div>
      {action && <div className="flex shrink-0 flex-wrap gap-[8px]">{action}</div>}
    </div>
  );
}

/** Placeholder rows while a list loads. */
export function LoadingRows({ rows = 5, className, rowClassName = "h-[56px]" }: { rows?: number; className?: string; rowClassName?: string }) {
  const { t } = useI18n();
  return (
    <div role="status" className={cn("space-y-[8px] p-[16px]", className)}>
      <span className="sr-only">{t("common.loading")}</span>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={cn("w-full", rowClassName)} />
      ))}
    </div>
  );
}

export function Spinner({ className, label }: { className?: string; label?: string }) {
  const { t } = useI18n();
  return (
    <span role="status" className={cn("inline-flex items-center gap-[8px] text-[13px] text-taupe", className)}>
      <Loader2 aria-hidden className="h-[16px] w-[16px] animate-spin" />
      {label ?? <span className="sr-only">{t("common.loading")}</span>}
    </span>
  );
}
