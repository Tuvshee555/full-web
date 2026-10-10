/* eslint-disable @next/next/no-img-element */
"use client";

import { API_BASE_URL } from "@/lib/api";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import axios from "axios";
import { Star, ImagePlus, Loader2 } from "lucide-react";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import { OrderDetails } from "./types";

type Props = {
  order: OrderDetails;
  token: string | null;
};

type Draft = {
  rating: number;
  comment: string;
  posting: boolean;
  imageFiles: File[];
  imagePreviews: string[];
  uploadedUrls: string[];
};

const clampRating = (n: number) => Math.max(1, Math.min(5, Math.floor(n)));

const safeToken = (token: string | null) => {
  if (!token) return null;
  const t = token.trim();
  if (!t || t === "null" || t === "undefined") return null;
  if (t.split(".").length < 3) return null;
  return t;
};

const MAX_IMAGES = 6;

async function uploadMedia(files: File[]): Promise<string[]> {
  if (!files.length) return [];
  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));
  const res = await axios.post(
    `${API_BASE_URL}/upload/media`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return res.data.urls;
}

export const OrderReviewSection = ({ order, token }: Props) => {
  const { t } = useI18n();
  const usableToken = useMemo(() => safeToken(token), [token]);

  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const canReview = useMemo(
    () => ["PAID", "DELIVERING", "DELIVERED"].includes(order.status),
    [order.status],
  );

  const initialDrafts = useMemo(() => {
    const map: Record<string, Draft> = {};
    for (const item of order.items) {
      map[item.food.id] = {
        rating: 5,
        comment: "",
        posting: false,
        imageFiles: [],
        imagePreviews: [],
        uploadedUrls: [],
      };
    }
    return map;
  }, [order.items]);

  const [drafts, setDrafts] = useState<Record<string, Draft>>(initialDrafts);

  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const item of order.items) {
        if (!next[item.food.id]) {
          next[item.food.id] = {
            rating: 5,
            comment: "",
            posting: false,
            imageFiles: [],
            imagePreviews: [],
            uploadedUrls: [],
          };
        }
      }
      const ids = new Set(order.items.map((x) => x.food.id));
      for (const k of Object.keys(next)) {
        if (!ids.has(k)) delete next[k];
      }
      return next;
    });
  }, [order.items]);

  const setRating = (foodId: string, rating: number) => {
    setDrafts((prev) => ({ ...prev, [foodId]: { ...prev[foodId], rating } }));
  };

  const addImages = (foodId: string, files: File[]) => {
    setDrafts((prev) => {
      const cur = prev[foodId];
      if (!cur) return prev;
      const spaceLeft = MAX_IMAGES - cur.imageFiles.length;
      const picked = files.slice(0, Math.max(0, spaceLeft));
      if (picked.length <= 0) {
        toast.error(t("max_photos_6") ?? "Max 6 photos");
        return prev;
      }
      const previews = picked.map((f) => URL.createObjectURL(f));
      return {
        ...prev,
        [foodId]: {
          ...cur,
          imageFiles: [...cur.imageFiles, ...picked].slice(0, MAX_IMAGES),
          imagePreviews: [...cur.imagePreviews, ...previews].slice(0, MAX_IMAGES),
        },
      };
    });
  };

  const removeImage = (foodId: string, index: number) => {
    setDrafts((prev) => {
      const cur = prev[foodId];
      if (!cur) return prev;
      return {
        ...prev,
        [foodId]: {
          ...cur,
          imageFiles: cur.imageFiles.filter((_, i) => i !== index),
          imagePreviews: cur.imagePreviews.filter((_, i) => i !== index),
          uploadedUrls: cur.uploadedUrls.filter((_, i) => i !== index),
        },
      };
    });
  };

  const submit = async (foodId: string) => {
    const d = drafts[foodId];
    if (!usableToken) {
      toast.error(t("login_to_review") ?? "Please login to leave a review.");
      return;
    }
    if (!d || d.posting) return;

    const trimmed = d.comment.trim();
    if (trimmed.length < 2) {
      toast.error(t("review_min_chars") ?? "Please write at least 2 characters.");
      return;
    }

    setDrafts((prev) => ({ ...prev, [foodId]: { ...prev[foodId], posting: true } }));

    try {
      let urls = d.uploadedUrls;
      if (d.imageFiles.length > 0 && urls.length !== d.imageFiles.length) {
        urls = await uploadMedia(d.imageFiles);
        setDrafts((prev) => ({ ...prev, [foodId]: { ...prev[foodId], uploadedUrls: urls } }));
      }

      const res = await fetch(
        `${API_BASE_URL}/review/food/${foodId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${usableToken}`,
          },
          body: JSON.stringify({ rating: clampRating(d.rating), comment: trimmed, images: urls }),
        },
      );

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json?.message || (t("failed_to_post_review") ?? "Failed to post review"));
        return;
      }

      toast.success(t("review_posted") ?? "Review posted");
      setDrafts((prev) => ({
        ...prev,
        [foodId]: { rating: 5, comment: "", posting: false, imageFiles: [], imagePreviews: [], uploadedUrls: [] },
      }));
    } catch {
      toast.error(t("server_error") ?? "Server error");
    } finally {
      setDrafts((prev) => ({
        ...prev,
        [foodId]: prev[foodId] ? { ...prev[foodId], posting: false } : prev[foodId],
      }));
    }
  };

  if (!canReview) {
    return (
      <div className="rounded-none border border-border bg-card p-6">
        <div className="store-heading mb-[6px] text-[30px]">{t("write_review") ?? "Write a review"}</div>
        <div className="text-xs text-muted-foreground leading-relaxed">
          {t("review_available_after_paid")}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-none border border-border bg-card p-6 space-y-5">
      <div>
        <div className="store-heading mb-[6px] text-[30px]">{t("write_review") ?? "Write a review"}</div>
        <div className="text-xs text-muted-foreground">{t("review_only_buyers")}</div>
      </div>

      <div className="space-y-4">
        {order.items.map((item) => {
          const foodId = item.food.id;
          const d = drafts[foodId];
          if (!d) return null;

          return (
            <div key={item.id} className="rounded-none border border-border bg-background p-5 space-y-4">
              {/* Item header */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{item.food.foodName}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {t("quantity") ?? "Qty"}: {item.quantity}
                  </div>
                </div>

                {/* Star rating */}
                <div className="flex gap-1 shrink-0">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(foodId, star)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-6 h-6 transition-colors ${
                          star <= d.rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <textarea
                value={d.comment}
                onChange={(e) =>
                  setDrafts((prev) => ({ ...prev, [foodId]: { ...prev[foodId], comment: e.target.value } }))
                }
                className="min-h-[100px] w-full rounded-none border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
                placeholder={t("review_placeholder") ?? "Share your experience..."}
                maxLength={800}
              />

              {/* Photo upload */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t("add_photos") ?? "Add photos"}
                </label>

                <div
                  onClick={() => fileRefs.current[foodId]?.click()}
                  className="border-2 border-dashed border-border rounded-none p-4
                    hover:border-primary/40 hover:bg-muted/30 transition-all cursor-pointer
                    flex flex-col items-center gap-2 text-center"
                >
                  <ImagePlus className="w-6 h-6 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{t("click_to_upload_photos")}</p>
                    <p className="text-xs text-muted-foreground">{t("max_photos_6")}</p>
                  </div>
                  <input
                    type="file"
                    ref={(el) => { fileRefs.current[foodId] = el; }}
                    className="hidden"
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      e.currentTarget.value = "";
                      if (!files.length) return;
                      addImages(foodId, files);
                    }}
                  />
                </div>

                {d.imageFiles.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {d.imageFiles.length}/{MAX_IMAGES} {t("photos_selected")}
                  </p>
                )}

                {d.imagePreviews.length > 0 && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-2">
                    {d.imagePreviews.map((src, idx) => (
                      <div key={src + idx} className="relative">
                        <img
                          src={src}
                          alt="preview"
                          className="w-full aspect-square object-cover rounded-none border border-border"
                        />
                        <button
                          onClick={() => removeImage(foodId, idx)}
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-foreground text-background text-xs flex items-center justify-center hover:bg-destructive transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit */}
              <button
                onClick={() => submit(foodId)}
                disabled={d.posting || d.comment.trim().length < 2}
                className="w-full h-[44px] rounded-none bg-primary text-primary-foreground text-sm font-medium
                  disabled:opacity-50 hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                {d.posting && <Loader2 className="w-4 h-4 animate-spin" />}
                {d.posting ? (t("posting") ?? "Posting...") : (t("post_review") ?? "Post review")}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
