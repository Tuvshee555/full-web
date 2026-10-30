import type { ReactNode } from "react";
import { cn } from "@admin/lib/utils";

/** Title, one plain sentence about the page, and the page's main actions on the right. */
export function PageHeader({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="mb-[20px] flex flex-col gap-[14px] md:mb-[24px] md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <h1>{title}</h1>
        {description && <p className="mt-[4px] max-w-[70ch] text-[14px] leading-relaxed text-taupe">{description}</p>}
        {children}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-[8px]">{actions}</div>}
    </header>
  );
}

/** White bordered section with an optional heading row. */
export function Panel({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
  id,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("admin-surface min-w-0", className)}>
      {(title || action) && (
        <div className="flex flex-wrap items-start justify-between gap-[12px] border-b border-ink/10 px-[16px] py-[14px] md:px-[20px]">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-semibold text-ink">{title}</h2>}
            {description && <p className="mt-[2px] text-[13px] leading-relaxed text-taupe">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
