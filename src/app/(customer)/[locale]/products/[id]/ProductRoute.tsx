/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";
import { useProducts } from "@/hooks/useProducts";
import { sanitizeProduct } from "@/utils/catalogSanitizer";
import { ProductPage } from "@/components/store/ProductPage";
import { useStoreT } from "@/components/store/lib/useStoreT";

class ProductRequestError extends Error {
  constructor(public status: number) { super("Product unavailable"); }
}

export default function ProductRoute({ id }: { id: string }) {
  const { st } = useStoreT();
  const { data: all = [] } = useProducts();
  const query = useQuery<any, ProductRequestError>({
    queryKey: ["product", id],
    queryFn: async ({ signal }) => {
      const res = await fetch(`${API_BASE_URL}/products/${encodeURIComponent(id)}`, { signal, cache: "no-store" });
      if (!res.ok) throw new ProductRequestError(res.status);
      const data = await res.json();
      if (!data || data.id !== id) throw new ProductRequestError(502);
      return sanitizeProduct(data);
    },
    // The grid can render immediately while a fresh inventory check runs.
    placeholderData: all.find((p) => p.id === id),
    staleTime: 0,
    retry: (count, error) => error.status !== 404 && count < 1,
  });

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [id]);

  const shown = query.data;
  if (query.error?.status === 404) notFound();
  if (query.isError) return (
    <div role="alert" className="page-width py-[64px] text-center">
      <p>{st("catalogue_error")}</p>
      <button type="button" onClick={() => void query.refetch()} className="btn-secondary mt-[16px]">{st("retry")}</button>
    </div>
  );
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
