"use client";
export const dynamic = "force-dynamic";

import { Suspense } from "react";
import SignInPageInner from "./components/SignInInner";

export default function Page() {
  return (
    <Suspense>
      <SignInPageInner />
    </Suspense>
  );
}
