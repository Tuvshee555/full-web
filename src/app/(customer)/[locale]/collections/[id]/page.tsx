"use client";

import { Suspense, use } from "react";
import { CollectionPage } from "@/components/store/CollectionPage";

export default function Collection({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense>
      <CollectionPage id={id} />
    </Suspense>
  );
}
