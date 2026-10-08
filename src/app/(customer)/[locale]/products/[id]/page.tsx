/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { use, useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";
import { useFood } from "@/hooks/useFood";
import { sanitizeFood } from "@/utils/catalogSanitizer";
import { ProductPage } from "@/components/store/ProductPage";

export default function Product({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [product, setProduct] = useState<any>(null);
  const [missing, setMissing] = useState(false);
  const { data: all = [] } = useFood();

  useEffect(() => {
    setProduct(null);
    setMissing(false);
    fetch(`${API_BASE_URL}/food/${id}`, { cache: "no-store" })
      .then(async (res) => (res.ok ? setProduct(sanitizeFood(await res.json())) : setMissing(true)))
      .catch(() => setMissing(true));
    window.scrollTo({ top: 0 });
  }, [id]);

  // Coming from a product grid the item is already cached: render it instantly,
  // then swap in the fresh copy when the request lands.
  const shown = product ?? all.find((p: any) => p.id === id);

  if (missing) notFound();
  if (!shown) return <ProductSkeleton />;

  // Same category first, then everything else
  const others = all.filter((p: any) => p.id !== shown.id);
  const related = [
    ...others.filter((p: any) => p.categoryId && p.categoryId === shown.categoryId),
    ...others.filter((p: any) => !p.categoryId || p.categoryId !== shown.categoryId),
  ];

  return <ProductPage key={shown.id} product={shown} related={related} />;
}

function ProductSkeleton() {
  return (
    <div className="page-width grid animate-pulse gap-[20px] pt-[20px] md:grid-cols-[55fr_45fr] md:gap-[50px] md:pt-[36px]">
      <div className="aspect-square bg-[#f3f3f3]" />
      <div className="space-y-[14px]">
        <div className="h-[12px] w-[90px] bg-[#f3f3f3]" />
        <div className="h-[36px] w-3/4 bg-[#f3f3f3]" />
        <div className="h-[20px] w-[120px] bg-[#f3f3f3]" />
        <div className="mt-[30px] h-[48px] max-w-[440px] bg-[#f3f3f3]" />
        <div className="h-[48px] max-w-[440px] bg-[#f3f3f3]" />
      </div>
    </div>
  );
}
