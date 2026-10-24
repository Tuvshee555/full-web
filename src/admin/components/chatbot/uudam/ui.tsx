import type { ComponentProps, ReactNode } from "react";
import { toast } from "sonner";
import { AlertCircle, RefreshCw, Search, Check, Loader2 } from "lucide-react";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
export const cx = (...values: Array<string | false | undefined>) => values.filter(Boolean).join(" ");
export function Button({ size: _size, variant = "secondary", className, type = "button", ...props }: ComponentProps<"button"> & { size?: string; variant?: string }) {
  return <button type={type} {...props} className={cx("inline-flex min-h-[44px] items-center justify-center gap-2 border px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40", variant === "primary" ? "border-ink bg-ink text-paper hover:bg-espresso" : variant === "ghost" ? "border-transparent bg-transparent text-ink hover:bg-sand" : "border-ink/20 bg-white text-ink hover:bg-sand", className)} />;
}
export function Card({ className, ...props }: ComponentProps<"div">) { return <div {...props} className={cx("border border-ink/10 bg-white", className)} />; }
export function Spinner({ className }: { className?: string }) { const { t } = useI18n(); return <span className={cx("inline-flex", className)} role="status"><Loader2 size={22} className="animate-spin" /><span className="sr-only">{t("common.loading")}</span></span>; }

export const Icons = { alert: AlertCircle, refresh: RefreshCw, search: Search, check: Check };
export function useToast() { return toast; }
export function Alert({ tone = "info", children }: { tone?: string; children: ReactNode }) { return <p className={cx("border p-3 text-sm", tone === "danger" ? "border-terracotta/30 bg-terracotta/5 text-terracotta" : "border-ink/15 bg-sand text-ink")} role="alert">{children}</p>; }
export function Badge({ tone = "neutral", children }: { tone?: string; children: ReactNode }) { return <span className={cx("border px-2 py-1 text-xs", tone === "danger" ? "border-terracotta/30 bg-terracotta/5 text-terracotta" : tone === "warning" ? "border-ink/20 bg-sand text-ink" : "border-ink/10 text-taupe")}>{children}</span>; }
export function Input({ className, ...props }: ComponentProps<"input">) { return <input {...props} className={cx("min-h-[44px] w-full border border-ink/20 bg-white p-3 text-base focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink sm:text-sm", className)} />; }
export function EmptyState({ title, description, icon }: { title: string; description?: string; icon?: ReactNode }) { return <div className="flex flex-col items-center px-4 py-12 text-center">{icon && <span className="mb-5 text-taupe">{icon}</span>}<p className="text-base font-medium text-ink">{title}</p>{description && <p className="mt-2 max-w-md text-sm leading-relaxed text-taupe">{description}</p>}</div>; }
