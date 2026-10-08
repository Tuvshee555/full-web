/* eslint-disable @next/next/no-img-element */
"use client";

import { API_BASE_URL } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/components/i18n/ClientI18nProvider";

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

const TOKEN_KEY = "token";

const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
};

const StarRow = ({ rating }: { rating: number }) => {
  const full = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={
            i < full
              ? "text-yellow-500 text-sm"
              : "text-muted-foreground text-sm"
          }
        >
          ★
        </span>
      ))}
    </div>
  );
};

const RatingBar = ({
  star,
  count,
  total,
}: {
  star: 1 | 2 | 3 | 4 | 5;
  count: number;
  total: number;
}) => {
  const percent = total ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-8 text-muted-foreground">{star}★</span>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-foreground"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="w-10 text-right text-muted-foreground">{count}</span>
    </div>
  );
};

export const FoodReviews = ({ foodId }: { foodId: string }) => {
  const { t } = useI18n();

  const [data, setData] = useState<ReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [sort, setSort] = useState<SortKey>("new");
  const [onlyPhotos, setOnlyPhotos] = useState(false);

  const token = useMemo(() => getToken(), []);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/review/food/${foodId}`,
        {
          cache: "no-store",
        },
      );

      if (!res.ok) throw new Error("Failed to fetch reviews");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("fetchReviews error:", err);
      setData({
        avgRating: 0,
        reviewCount: 0,
        ratingCount: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        reviews: [],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foodId]);

  const avg = data?.avgRating ?? 0;
  const count = data?.reviewCount ?? 0;
  const ratingCount = data?.ratingCount ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  const reviews = useMemo(() => {
    const list = [...(data?.reviews ?? [])];

    const filtered = onlyPhotos ? list.filter((r) => r.images?.length) : list;

    if (sort === "high") filtered.sort((a, b) => b.rating - a.rating);
    if (sort === "low") filtered.sort((a, b) => a.rating - b.rating);
    if (sort === "new")
      filtered.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

    return filtered;
  }, [data?.reviews, onlyPhotos, sort]);

  // No reviews yet: a quiet line instead of an empty 0.0 / five empty bars box
  if (loading && !data) return null;
  if (count === 0) {
    return (
      <div className="w-full border-t border-border pt-6">
        <h2 className="text-[20px] font-semibold text-[#121212]">{t("reviews") ?? "Reviews"}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("no_reviews") ?? "No reviews yet."}{" "}
          {t("review_after_purchase") ?? "You can leave a review from your Order page after purchase."}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="rounded-none border border-border bg-card p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
          {/* Left: summary */}
          <div className="w-full lg:w-[340px]">
            <h2 className="text-base font-semibold">
              {t("reviews") ?? "Reviews"}
            </h2>

            <div className="mt-3 flex items-center gap-3">
              <div className="text-3xl font-bold">{avg.toFixed(1)}</div>
              <div className="flex flex-col gap-1">
                <StarRow rating={avg} />
                <div className="text-xs text-muted-foreground">
                  {count} {t("reviews") ?? "reviews"}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              {[5, 4, 3, 2, 1].map((s) => (
                <RatingBar
                  key={s}
                  star={s as 1 | 2 | 3 | 4 | 5}
                  count={ratingCount[s as 1 | 2 | 3 | 4 | 5] ?? 0}
                  total={count}
                />
              ))}
            </div>

            {/* info block */}
            <div className="mt-6 rounded-none border border-border bg-background p-3">
              <div className="text-sm font-medium">
                {t("write_review") ?? "Write a review"}
              </div>

              <div className="mt-1 text-xs text-muted-foreground leading-relaxed">
                {token
                  ? (t("review_after_purchase") ??
                    "You can leave a review from your Order page after purchase.")
                  : (t("login_to_review") ?? "Please login to leave a review.")}
              </div>
            </div>
          </div>

          {/* Right: list */}
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-sm font-semibold">
                {t("customer_reviews") ?? "Customer Reviews"}
              </div>

              <div className="flex flex-wrap gap-2">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="h-[40px] px-3 rounded-md border border-border bg-background text-sm"
                >
                  <option value="new">{t("sort_newest") ?? "Newest"}</option>
                  <option value="high">
                    {t("sort_high") ?? "Highest rating"}
                  </option>
                  <option value="low">
                    {t("sort_low") ?? "Lowest rating"}
                  </option>
                </select>

                <button
                  onClick={() => setOnlyPhotos((p) => !p)}
                  className={`h-[40px] px-3 rounded-md border text-sm ${
                    onlyPhotos
                      ? "bg-foreground text-background border-foreground"
                      : "bg-background text-foreground border-border"
                  }`}
                >
                  {t("only_photos") ?? "Only with photos"}
                </button>

                {loading && (
                  <div className="h-[40px] px-3 rounded-md border border-border bg-background text-xs text-muted-foreground flex items-center">
                    {t("loading") ?? "Loading..."}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-4">
              {!loading && !reviews.length ? (
                <div className="text-sm text-muted-foreground">
                  {t("no_reviews") ?? "No reviews yet."}
                </div>
              ) : (
                reviews.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-none border border-border bg-background p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <div className="text-sm font-medium">
                          {r.user?.name ?? "User"}
                        </div>
                        <div className="flex items-center gap-2">
                          <StarRow rating={r.rating} />
                          {r.verifiedPurchase && (
                            <span className="text-[11px] px-2 py-1 rounded-full bg-muted border border-border text-muted-foreground">
                              {t("verified_purchase") ?? "Verified purchase"}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(r.createdAt)}
                      </div>
                    </div>

                    <p className="mt-3 text-sm text-foreground leading-relaxed whitespace-pre-line">
                      {r.comment}
                    </p>

                    {!!r.images?.length && (
                      <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {r.images.map((img) => (
                          <img
                            key={img}
                            src={img}
                            alt="review"
                            className="w-full aspect-square object-cover rounded-md border border-border"
                            loading="lazy"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
