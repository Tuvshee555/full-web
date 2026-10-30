import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Clock3, MinusCircle, Truck, XCircle, type LucideIcon } from "lucide-react";
import { cn } from "@admin/lib/utils";
import { Skeleton } from "./skeleton";

/**
 * What a status means for the owner, shown the same way on every screen:
 * attention = you need to act, waiting = waiting on the customer or a provider,
 * progress = under way, success = done, neutral = inactive, danger = something went wrong.
 */
export type Tone = "attention" | "waiting" | "progress" | "success" | "neutral" | "danger";

// Solid backgrounds (each tint pre-mixed on white) keep text contrast the same on any row colour.
const TONE_CLASS: Record<Tone, string> = {
  attention: "bg-[#f6ecea] text-terracotta",
  waiting: "bg-sand text-ink",
  progress: "bg-[#eeedec] text-ink",
  success: "bg-[#e6e9e4] text-[#3d4a34]",
  neutral: "bg-[#f3f2f1] text-taupe",
  danger: "bg-terracotta text-paper",
};

const TONE_ICON: Record<Tone, LucideIcon> = {
  attention: AlertCircle,
  waiting: Clock3,
  progress: Truck,
  success: CheckCircle2,
  neutral: MinusCircle,
  danger: XCircle,
};

/** Coloured label with an icon, so the meaning never depends on colour alone. */
export function StatusPill({
  tone,
  children,
  icon,
  className,
}: {
  tone: Tone;
  children: ReactNode;
  icon?: LucideIcon | null;
  className?: string;
}) {
  const Icon = icon === null ? null : icon ?? TONE_ICON[tone];
  return (
    <span className={cn("inline-flex max-w-full items-center gap-[5px] whitespace-nowrap px-[8px] py-[3px] text-[12px] font-medium leading-[18px]", TONE_CLASS[tone], className)}>
      {Icon && <Icon aria-hidden className="h-[13px] w-[13px] shrink-0" strokeWidth={2} />}
      <span className="truncate">{children}</span>
    </span>
  );
}

/** Small square marker for list rows (unread, needs attention). */
export function Dot({ tone = "attention", label }: { tone?: Tone; label?: string }) {
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("inline-block h-[8px] w-[8px] shrink-0", tone === "attention" || tone === "danger" ? "bg-terracotta" : "bg-ink")}
    />
  );
}

/** One number with a plain label, an optional explanation and an optional link. */
export function StatCard({
  label,
  value,
  hint,
  hintTone = "muted",
  loading,
  onClick,
  actionLabel,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  hintTone?: "muted" | "good" | "bad";
  loading?: boolean;
  onClick?: () => void;
  actionLabel?: string;
}) {
  const body = (
    <>
      <p className="text-[13px] text-taupe">{label}</p>
      {loading ? (
        <Skeleton className="mt-[10px] h-[30px] w-2/3" />
      ) : (
        <p className="mt-[6px] break-words text-[clamp(1.25rem,3.2vw,1.625rem)] font-semibold leading-tight tabular-nums text-ink">{value}</p>
      )}
      {hint && !loading && (
        <p className={cn("mt-[6px] text-[12px] leading-snug", hintTone === "good" ? "text-[#3d4a34]" : hintTone === "bad" ? "text-terracotta" : "text-taupe")}>{hint}</p>
      )}
      {onClick && actionLabel && <span className="mt-[10px] inline-block text-[13px] font-medium text-ink underline underline-offset-4">{actionLabel}</span>}
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="admin-surface block w-full p-[16px] text-left transition-colors hover:border-ink/35 md:p-[18px]">
        {body}
      </button>
    );
  }
  return <div className="admin-surface p-[16px] md:p-[18px]">{body}</div>;
}
