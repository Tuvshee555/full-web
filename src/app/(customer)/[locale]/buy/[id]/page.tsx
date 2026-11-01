"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";
import { addToCart } from "@/components/store/lib/cart";
import { productUrl, sizeLabel, sizeSoldOut } from "@/components/store/lib/product";
import { useStoreT } from "@/components/store/lib/useStoreT";

/**
 * The chat assistant's checkout link: /mn/buy/<product>?size=…&qty=… puts the item in the cart and
 * opens the real checkout (QPay or bank transfer). A sold-out or unknown choice falls back to the
 * product page, where the shopper can pick something else.
 */
export default function BuyPage() {
  const params = useParams<{ locale: string; id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const { st, locale } = useStoreT();
  const [failed, setFailed] = useState(false);
  const id = params?.id ?? "";

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/products/${encodeURIComponent(id)}`, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
        if (!res.ok) throw new Error(String(res.status));
        const product = await res.json();
        if (cancelled || !product?.id) throw new Error("missing");
        const sizes: unknown[] = Array.isArray(product.sizes) ? product.sizes : [];
        const wanted = search?.get("size") || null;
        const chosen = wanted ? sizes.find((s) => sizeLabel(s) === wanted) : sizes[0];
        if ((sizes.length && !chosen) || (chosen && sizeSoldOut(chosen))) {
          router.replace(productUrl(locale, id));
          return;
        }
        const qty = Math.min(99, Math.max(1, Number(search?.get("qty")) || 1));
        addToCart(product, qty, chosen ? sizeLabel(chosen) : null, false);
        router.replace(`/${locale}/checkout`);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => { cancelled = true; };
  }, [id, locale, router, search]);

  return (
    <div className="page-width flex min-h-[50vh] flex-col items-center justify-center gap-[16px] py-[60px] text-center">
      <p role="status" className="text-[16px] text-ink/70">{failed ? st("catalogue_error") : st("buy_link_adding")}</p>
      {failed && <Link href={productUrl(locale, id)} className="btn">{st("buy_link_open_product")}</Link>}
    </div>
  );
}
