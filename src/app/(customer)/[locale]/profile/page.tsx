"use client";

import { Suspense } from "react";
import ProfileInner from "./ProfileInner";

export default function ProfilePage() {
  return (
    <Suspense fallback={<p className="text-white p-10">Түр хүлээнэ үү...</p>}>
      <ProfileInner />
    </Suspense>
  );
}
