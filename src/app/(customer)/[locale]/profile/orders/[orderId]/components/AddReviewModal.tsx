/* eslint-disable @next/next/no-img-element */
"use client";

import { API_BASE_URL } from "@/lib/api";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/components/i18n/ClientI18nProvider";

type Props = {
  open: boolean;
  onClose: () => void;
  token: string;
  foodId: string;
  foodName: string;
  onSuccess: () => void;
};

const clampRating = (v: number) => Math.max(1, Math.min(5, Math.floor(v)));

export const AddReviewModal = ({
  open,
  onClose,
  token,
  foodId,
  foodName,
  onSuccess,
}: Props) => {
  const { t } = useI18n();

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(
    () => comment.trim().length >= 2 && !submitting,
    [comment, submitting],
  );

  if (!open) return null;

  const handleUpload = async (file: File) => {
    try {
      const form = new FormData();
      form.append("file", file);

      // ✅ your backend already has /upload route
      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        body: form,
      });

      const data = await res.json();
      const url = data?.url || data?.secure_url || data?.image;

      if (!res.ok || !url) throw new Error("Upload failed");

      setImages((prev) => [...prev, String(url)].slice(0, 6));
    } catch (err) {
      console.error(err);
      toast.error(t("upload_failed") ?? "Upload failed");
    }
  };

  const submit = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/review/food/${foodId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            rating: clampRating(rating),
            comment: comment.trim(),
            images,
          }),
        },
      );

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(
          json?.message ||
            (t("failed_to_post_review") ?? "Failed to post review"),
        );
        return;
      }

      toast.success(t("review_posted") ?? "Review posted");
      setComment("");
      setRating(5);
      setImages([]);
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(t("server_error") ?? "Server error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-none border border-border bg-card p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold">
              {t("write_review") ?? "Write a review"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">{foodName}</div>
          </div>
          <button
            onClick={onClose}
            className="h-9 px-3 rounded-none border border-border bg-background text-sm"
          >
            {t("close") ?? "Close"}
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {t("rating") ?? "Rating"}:
            </span>
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="h-[40px] px-3 rounded-none border border-border bg-background text-sm"
            >
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="min-h-[100px] w-full rounded-none border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-foreground/20"
            placeholder={t("review_placeholder") ?? "Share your experience..."}
            maxLength={800}
          />

          {/* Upload */}
          <div className="flex flex-col gap-2">
            <div className="text-xs font-medium">
              {t("add_photos") ?? "Add photos"}
            </div>

            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
              }}
              className="text-sm"
            />

            {!!images.length && (
              <div className="grid grid-cols-4 gap-2">
                {images.map((img) => (
                  <div key={img} className="relative">
                    <img
                      src={img}
                      alt="review"
                      className="w-full aspect-square object-cover rounded-none border border-border"
                    />
                    <button
                      onClick={() =>
                        setImages((prev) => prev.filter((x) => x !== img))
                      }
                      className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-foreground text-background text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="text-[11px] text-muted-foreground">
              {t("max_photos_6") ?? "Max 6 photos"}
            </div>
          </div>

          <button
            onClick={submit}
            disabled={!canSubmit}
            className="h-[44px] w-full rounded-none bg-foreground text-background text-sm font-medium disabled:opacity-50"
          >
            {submitting
              ? (t("posting") ?? "Posting...")
              : (t("post_review") ?? "Post review")}
          </button>
        </div>
      </div>
    </div>
  );
};
