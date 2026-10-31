/* eslint-disable @next/next/no-img-element */
"use client";

import { API_BASE_URL } from "@/lib/api";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import axios from "axios";
import { Check, ImagePlus, Loader2, Star, X } from "lucide-react";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import { useStoreT } from "@/components/store/lib/useStoreT";
import { imageUrl } from "@/lib/image";
import { OrderDetails } from "./types";

type Props = {
  order: OrderDetails;
  token: string | null;
};

type Draft = {
  /** 0 until the customer picks a star: a review never starts out as "5 stars". */
  rating: number;
  comment: string;
  posting: boolean;
  posted: boolean;
  imageFiles: File[];
  imagePreviews: string[];
  uploadedUrls: string[];
};

const emptyDraft = (): Draft => ({ rating: 0, comment: "", posting: false, posted: false, imageFiles: [], imagePreviews: [], uploadedUrls: [] });

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
  const { st } = useStoreT();
  const usableToken = useMemo(() => safeToken(token), [token]);

  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const canReview = useMemo(
    () => ["PAID", "DELIVERING", "DELIVERED"].includes(order.status),
    [order.status],
  );

  // One form per product, even when the order has it twice in different options.
  const products = useMemo(() => {
    const seen = new Set<string>();
    return order.items.filter((item) => !seen.has(item.product.id) && Boolean(seen.add(item.product.id)));
  }, [order.items]);

  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => Object.fromEntries(products.map((item) => [item.product.id, emptyDraft()])));

  useEffect(() => {
    setDrafts((prev) => {
      const next: Record<string, Draft> = {};
      for (const item of products) next[item.product.id] = prev[item.product.id] ?? emptyDraft();
      return next;
    });
  }, [products]);

  const update = (productId: string, patch: Partial<Draft>) =>
    setDrafts((prev) => (prev[productId] ? { ...prev, [productId]: { ...prev[productId], ...patch } } : prev));

  const addImages = (productId: string, files: File[]) => {
    setDrafts((prev) => {
      const cur = prev[productId];
      if (!cur) return prev;
      const spaceLeft = MAX_IMAGES - cur.imageFiles.length;
      const picked = files.slice(0, Math.max(0, spaceLeft));
      if (picked.length <= 0) {
        toast.error(t("max_photos_6"));
        return prev;
      }
      const previews = picked.map((f) => URL.createObjectURL(f));
      return {
        ...prev,
        [productId]: {
          ...cur,
          imageFiles: [...cur.imageFiles, ...picked].slice(0, MAX_IMAGES),
          imagePreviews: [...cur.imagePreviews, ...previews].slice(0, MAX_IMAGES),
          uploadedUrls: [],
        },
      };
    });
  };

  const removeImage = (productId: string, index: number) => {
    setDrafts((prev) => {
      const cur = prev[productId];
      if (!cur) return prev;
      URL.revokeObjectURL(cur.imagePreviews[index]);
      return {
        ...prev,
        [productId]: {
          ...cur,
          imageFiles: cur.imageFiles.filter((_, i) => i !== index),
          imagePreviews: cur.imagePreviews.filter((_, i) => i !== index),
          uploadedUrls: [],
        },
      };
    });
  };

  const submit = async (productId: string) => {
    const d = drafts[productId];
    if (!usableToken) {
      toast.error(t("login_to_review"));
      return;
    }
    if (!d || d.posting) return;
    if (d.rating < 1) {
      toast.error(st("review_pick_rating"));
      return;
    }

    const trimmed = d.comment.trim();
    if (trimmed.length < 2) {
      toast.error(t("review_min_chars"));
      return;
    }

    update(productId, { posting: true });

    try {
      let urls = d.uploadedUrls;
      if (d.imageFiles.length > 0 && urls.length !== d.imageFiles.length) {
        urls = await uploadMedia(d.imageFiles);
        update(productId, { uploadedUrls: urls });
      }

      const res = await fetch(
        `${API_BASE_URL}/review/products/${productId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${usableToken}`,
          },
          body: JSON.stringify({ rating: Math.min(5, Math.max(1, Math.floor(d.rating))), comment: trimmed, images: urls }),
        },
      );

      if (!res.ok) {
        // The API explains itself in English; the customer gets the same reason in their language.
        toast.error(
          res.status === 401 ? t("login_to_review") : res.status === 403 ? st("review_not_bought") : t("failed_to_post_review"),
        );
        return;
      }

      toast.success(t("review_posted"));
      d.imagePreviews.forEach((src) => URL.revokeObjectURL(src));
      setDrafts((prev) => ({ ...prev, [productId]: { ...emptyDraft(), posted: true } }));
    } catch {
      toast.error(t("failed_to_post_review"));
    } finally {
      update(productId, { posting: false });
    }
  };

  if (!canReview) {
    return (
      <div className="border-t border-ink/10 pt-[28px]">
        <h2 className="store-heading mb-[6px] text-[30px]">{t("write_review")}</h2>
        <p className="text-[14px] leading-relaxed text-ink/60">{t("review_available_after_paid")}</p>
      </div>
    );
  }

  return (
    <div className="border-t border-ink/10 pt-[28px]">
      <h2 className="store-heading mb-[6px] text-[30px]">{t("write_review")}</h2>
      <p className="text-[14px] text-ink/60">{t("review_only_buyers")}</p>

      <ul className="mt-[16px] divide-y divide-ink/10 border-y border-ink/10">
        {products.map((item) => {
          const productId = item.product.id;
          const d = drafts[productId];
          if (!d) return null;
          const open = d.rating > 0 && !d.posted;

          return (
            <li key={productId} className="py-[16px]">
              <div className="flex flex-wrap items-center gap-x-[14px] gap-y-[10px]">
                <div className="product-media h-[60px] w-[48px] shrink-0">
                  {item.product.image && <img src={imageUrl(item.product.image, 120)} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                </div>
                <p className="min-w-0 flex-1 text-[15px] font-medium leading-snug text-ink">{item.product.productName}</p>
                {d.posted ? (
                  <p role="status" className="flex items-center gap-[6px] text-[14px] text-ink">
                    <Check aria-hidden className="h-[16px] w-[16px]" strokeWidth={1.6} />
                    {st("review_thanks")}
                  </p>
                ) : (
                  <fieldset className="flex items-center">
                    <legend className="sr-only">{st("your_rating", { name: item.product.productName })}</legend>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <label
                        key={star}
                        className="flex h-[44px] w-[40px] cursor-pointer items-center justify-center has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink"
                      >
                        <input
                          type="radio"
                          name={`rating-${productId}`}
                          value={star}
                          checked={d.rating === star}
                          onChange={() => update(productId, { rating: star })}
                          className="sr-only"
                        />
                        <Star aria-hidden strokeWidth={1.2} className={`h-[24px] w-[24px] transition-colors ${star <= d.rating ? "fill-ink text-ink" : "text-ink/35 hover:text-ink"}`} />
                        <span className="sr-only">{st("rate_n_stars", { n: star })}</span>
                      </label>
                    ))}
                  </fieldset>
                )}
              </div>

              {open && (
                <div className="mt-[14px] space-y-[12px] sm:pl-[62px]">
                  <label className="block">
                    <span className="sr-only">{st("your_review")}</span>
                    <textarea
                      value={d.comment}
                      onChange={(e) => update(productId, { comment: e.target.value })}
                      className="min-h-[110px] w-full resize-y bg-white p-[14px] text-[16px] text-ink outline-none shadow-[inset_0_0_0_1px_rgba(28,23,20,0.25)] focus:shadow-[inset_0_0_0_1.5px_#1c1714]"
                      placeholder={t("review_placeholder")}
                      maxLength={800}
                    />
                  </label>

                  <div className="flex flex-wrap items-center gap-[10px]">
                    <button
                      type="button"
                      onClick={() => fileRefs.current[productId]?.click()}
                      disabled={d.imageFiles.length >= MAX_IMAGES}
                      className="inline-flex min-h-[44px] items-center gap-[8px] border border-dashed border-ink/30 px-[14px] text-[14px] text-ink hover:border-ink disabled:opacity-40"
                    >
                      <ImagePlus aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.3} />
                      {t("add_photos")}
                    </button>
                    <span className="text-[13px] text-taupe">
                      {d.imageFiles.length > 0 ? `${d.imageFiles.length}/${MAX_IMAGES} ${t("photos_selected")}` : t("max_photos_6")}
                    </span>
                    <input
                      type="file"
                      ref={(el) => { fileRefs.current[productId] = el; }}
                      className="hidden"
                      multiple
                      accept="image/*"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        e.currentTarget.value = "";
                        if (!files.length) return;
                        addImages(productId, files);
                      }}
                    />
                  </div>

                  {d.imagePreviews.length > 0 && (
                    <ul className="grid grid-cols-4 gap-[8px] sm:grid-cols-6">
                      {d.imagePreviews.map((src, idx) => (
                        <li key={src} className="product-media aspect-square">
                          <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeImage(productId, idx)}
                            aria-label={st("remove_photo", { n: idx + 1 })}
                            className="absolute right-0 top-0 flex h-[32px] w-[32px] items-center justify-center bg-ink text-paper hover:bg-terracotta"
                          >
                            <X aria-hidden className="h-[14px] w-[14px]" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <button
                    type="button"
                    onClick={() => submit(productId)}
                    disabled={d.posting || d.comment.trim().length < 2}
                    className="btn w-full sm:w-auto"
                  >
                    {d.posting && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
                    {d.posting ? t("posting") : t("post_review")}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
