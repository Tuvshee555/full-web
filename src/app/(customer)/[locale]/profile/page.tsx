"use client";

import { Suspense } from "react";
import ProfileInner from "./ProfileInner";

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <ProfileInner />
    </Suspense>
  );
}
