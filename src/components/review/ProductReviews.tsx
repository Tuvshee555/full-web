/* eslint-disable @next/next/no-img-element */
"use client";

import { API_BASE_URL } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import { Stars } from "@/components/store/ui";
import { formatDate } from "@/components/store/lib/product";
import { useStoreT } from "@/components/store/lib/useStoreT";

type ReviewUser = { id: string; name: string };

type Review = {
  id: string;
  rating: number;
  comment: string;
  images: string[];
  verifiedPurchase: boolean;
  createdAt: string;
  user: ReviewUser;
};

type ReviewsResponse = {
  avgRating: number;
  reviewCount: number;
  ratingCount: Record<1 | 2 | 3 | 4 | 5, number>;
  reviews: Review[];
};

type SortKey = "new" | "high" | "low";

const EMPTY: ReviewsResponse = { avgRating: 0, reviewCount: 0, ratingCount: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, reviews: [] };

const getToken = () => {
  try {
    return localStorage.getItem("token");
  } catch {
    return null;
  }
};

const RatingBar = ({ star, count, total }: { star: 1 | 2 | 3 | 4 | 5; count: number; total: number }) => {
  const percent = total ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-[10px] text-[13px]">
      <span className="w-[28px] text-taupe">{star}★</span>
      <div aria-hidden className="h-[6px] flex-1 overflow-hidden bg-sand">
        <div className="h-full bg-ink" style={{ width: `${percent}%` }} />
      </div>
      <span className="w-[28px] text-right tabular-nums text-taupe">{count}</span>
    </div>
  );
};

export const ProductReviews = ({ productId }: { productId: string }) => {
  const { t } = useI18n();
  const { st, locale } = useStoreT();

  const [data, setData] = useState<ReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortKey>("new");
  const [onlyPhotos, setOnlyPhotos] = useState(false);
  const token = useMemo(() => getToken(), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`${API_BASE_URL}/review/products/${productId}`, { cache: "no-store", signal: controller.signal })
      .then((res) => (res.ok ? res.json() : EMPTY))
      .then((json: ReviewsResponse) => setData(json))
      // Reviews are extra: if they fail to load, the page simply shows none.
      .catch(() => { if (!controller.signal.aborted) setData(EMPTY); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [productId]);

  const avg = data?.avgRating ?? 0;
  const count = data?.reviewCount ?? 0;
  const ratingCount = data?.ratingCount ?? EMPTY.ratingCount;
  const withPhotos = (data?.reviews ?? []).some((r) => r.images?.length);

  const reviews = useMemo(() => {
    const list = [...(data?.reviews ?? [])];
    const filtered = onlyPhotos ? list.filter((r) => r.images?.length) : list;
    if (sort === "high") filtered.sort((a, b) => b.rating - a.rating);
    if (sort === "low") filtered.sort((a, b) => a.rating - b.rating);
    if (sort === "new") filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return filtered;
  }, [data?.reviews, onlyPhotos, sort]);

  const heading = <h2 className="store-heading text-[30px] sm:text-[38px]">{t("reviews")}</h2>;

  // No reviews yet: a quiet line instead of an empty 0.0 / five empty bars box
  if (loading && !data) return null;
  if (count === 0) {
    return (
      <div className="w-full border-t border-line pt-[28px]">
        {heading}
        <p className="mt-[8px] text-[14px] text-taupe">
          {t("no_reviews")} {t("review_after_purchase")}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full border-t border-line pt-[28px]">
      <div className="grid gap-[32px] lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-[56px]">
        <div>
          {heading}
          <div className="mt-[16px] flex items-center gap-[14px]">
            <p className="store-heading text-[52px] leading-none">{avg.toFixed(1)}</p>
            <div>
              <Stars avg={avg} count={count} hideCount />
              <p className="text-[13px] text-taupe">{st("reviews_count", { n: count })}</p>
            </div>
          </div>
          <div className="mt-[18px] flex flex-col gap-[8px]">
            {[5, 4, 3, 2, 1].map((s) => (
              <RatingBar key={s} star={s as 1 | 2 | 3 | 4 | 5} count={ratingCount[s as 1 | 2 | 3 | 4 | 5] ?? 0} total={count} />
            ))}
          </div>
          <p className="mt-[20px] border-t border-line pt-[14px] text-[13px] leading-relaxed text-taupe">
            {token ? t("review_after_purchase") : t("login_to_review")}
          </p>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-[10px]">
            <p className="text-[15px] font-medium text-ink">{t("customer_reviews")}</p>
            <div className="flex flex-wrap gap-[8px]">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                aria-label={st("sort_by")}
                className="h-[44px] border border-ink/25 bg-white px-[12px] text-[14px] text-ink"
              >
                <option value="new">{t("sort_newest")}</option>
                <option value="high">{t("sort_high")}</option>
                <option value="low">{t("sort_low")}</option>
              </select>
              {withPhotos && (
                <button
                  type="button"
                  aria-pressed={onlyPhotos}
                  onClick={() => setOnlyPhotos((p) => !p)}
                  className={`h-[44px] border px-[14px] text-[14px] ${onlyPhotos ? "border-ink bg-ink text-paper" : "border-ink/25 bg-white text-ink hover:border-ink"}`}
                >
                  {t("only_photos")}
                </button>
              )}
            </div>
          </div>

          <ul aria-busy={loading} className="mt-[8px]">
            {reviews.map((r) => (
              <li key={r.id} className="border-b border-line py-[20px]">
                <div className="flex flex-wrap items-baseline justify-between gap-x-[12px] gap-y-[4px]">
                  <p className="text-[14px] font-medium text-ink">
                    {r.user?.name || st("customer")}
                    {r.verifiedPurchase && <span className="font-normal text-taupe"> · {t("verified_purchase")}</span>}
                  </p>
                  <p className="text-[13px] text-taupe">{formatDate(r.createdAt, locale)}</p>
                </div>
                <Stars avg={r.rating} count={1} hideCount size={13} label={`${r.rating} / 5`} className="mt-[6px]" />
                <p className="mt-[8px] whitespace-pre-line text-[15px] leading-relaxed text-[#403831]">{r.comment}</p>
                {!!r.images?.length && (
                  <div className="mt-[12px] grid max-w-[480px] grid-cols-3 gap-[8px] sm:grid-cols-4">
                    {r.images.map((img, i) => {
                      const photo = <img src={img} alt={st("review_photo", { n: i + 1 })} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />;
                      // Addresses come from customers: only a plain web address becomes a link.
                      return /^https:\/\//i.test(img) ? (
                        <a key={img} href={img} target="_blank" rel="noopener noreferrer" className="product-media block aspect-square">{photo}</a>
                      ) : (
                        <div key={img} className="product-media aspect-square">{photo}</div>
                      );
                    })}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
