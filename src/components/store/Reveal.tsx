import { type ElementType, type ReactNode } from "react";

/** Layout wrapper; content is visible immediately on every screen and connection. */
export function Reveal({ as: Tag = "div", className = "", children }: {
  as?: ElementType;
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  return <Tag className={className}>{children}</Tag>;
}
