import type { ReactNode } from "react";

// A layout that only exists to carry a route's metadata. Client-component pages
// cannot export `generateMetadata`, so the route's layout does it instead.
export default function PassThrough({ children }: { children: ReactNode }) {
  return children;
}
