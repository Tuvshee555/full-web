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
    fetch(`${API_BASE_URL}/food/${id}`, { cache: "no-store" })
      .then(async (res) => (res.ok ? setProduct(sanitizeFood(await res.json())) : setMissing(true)))
      .catch(() => setMissing(true));
    window.scrollTo({ top: 0 });
  }, [id]);

  if (missing) notFound();
  if (!product) return <div className="min-h-[70vh]" />;

  // Same category first, then everything else
  const others = all.filter((p: any) => p.id !== product.id);
  const related = [
    ...others.filter((p: any) => p.categoryId && p.categoryId === product.categoryId),
    ...others.filter((p: any) => !p.categoryId || p.categoryId !== product.categoryId),
  ];

  return <ProductPage product={product} related={related} />;
}
