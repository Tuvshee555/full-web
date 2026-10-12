import type { ComponentProps, ReactNode } from "react";
import { toast } from "sonner";
import { AlertCircle, RefreshCw, Search, Check } from "lucide-react";
export const cx = (...values: Array<string | false | undefined>) => values.filter(Boolean).join(" ");
export function Button({ size: _size, variant: _variant, className, ...props }: ComponentProps<"button"> & { size?: string; variant?: string }) { return <button {...props} className={cx("border border-ink/20 bg-white px-3 py-2 text-sm hover:bg-sand disabled:opacity-40", className)} />; }
export function Card({ className, ...props }: ComponentProps<"div">) { return <div {...props} className={cx("border border-ink/10 bg-white", className)} />; }
export function Spinner({ className }: { className?: string }) { return <span className={cx("text-sm", className)} role="status">…</span>; }

export const Icons = { alert: AlertCircle, refresh: RefreshCw, search: Search, check: Check };
export function useToast() { return toast; }
export function Alert({ tone: _tone, children }: { tone?: string; children: ReactNode }) { return <p className="border border-terracotta/20 bg-sand p-3 text-sm" role="alert">{children}</p>; }
export function Badge({ tone: _tone, children }: { tone?: string; children: ReactNode }) { return <span className="border border-ink/10 px-2 py-1 text-xs text-terracotta">{children}</span>; }
export function Input({ className, ...props }: ComponentProps<"input">) { return <input {...props} className={cx("w-full border border-ink/20 bg-white p-2 text-sm", className)} />; }
export function EmptyState({ title, description, icon }: { title: string; description?: string; icon?: ReactNode }) { return <div className="py-6 text-sm text-taupe">{icon}<p>{title}</p><p>{description}</p></div>; }
