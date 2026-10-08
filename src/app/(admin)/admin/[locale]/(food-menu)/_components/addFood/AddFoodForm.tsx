/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client";

import { ChangeEvent, useRef, useState } from "react";
import { X, Plus, ImagePlus, Images, Video } from "lucide-react";
import { Input } from "@admin/components/ui/input";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";

interface Props {
  category: { id: string; categoryName: string };
  foodData: any;
  setFoodData: (v: any) => void;
  oldPrice: string;
  setOldPrice: (v: string) => void;
  images: File[];
  setImages: (v: File[]) => void;
  imagePreviews: string[];
  setImagePreviews: (v: string[]) => void;
  setVideo: (v: File | null) => void;
  videoPreview: string | null;
  setVideoPreview: (v: string | null) => void;
  sizes: string[];
  setSizes: (v: string[]) => void;
  isFeatured: boolean;
  setIsFeatured: (v: boolean) => void;
  closeModal: () => void;
}

export const AddFoodForm = ({
  foodData,
  setFoodData,
  oldPrice,
  setOldPrice,
  images,
  setImages,
  imagePreviews,
  setImagePreviews,
  setVideo,
  sizes,
  setSizes,
  isFeatured,
  setIsFeatured,
}: Props) => {
  const { t } = useI18n();
  const [newSize, setNewSize] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFoodData((p: any) => ({ ...p, [name]: value }));
  };

  const handleImages = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const list = Array.from(files);
    setImages([...images, ...list]);
    setImagePreviews([
      ...imagePreviews,
      ...list.map((f) => URL.createObjectURL(f)),
    ]);
  };

  const removeImage = (i: number) => {
    setImages(images.filter((_, idx) => idx !== i));
    setImagePreviews(imagePreviews.filter((_, idx) => idx !== i));
  };

  const handleThumbnail = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    setThumbnailFile(file);
    setVideo(file);
  };

  const addSize = () => {
    if (!newSize.trim()) return;
    setSizes([...sizes, newSize.trim()]);
    setNewSize("");
  };

  const removeSize = (i: number) =>
    setSizes(sizes.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-4">
      {/* Section 1 — Basic Info */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Нэр
            </label>
            <Input
              name="foodName"
              placeholder={t("food.fields.name")}
              className="h-9"
              value={foodData.foodName}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Үнэ
            </label>
            <Input
              name="price"
              type="number"
              placeholder={t("food.fields.price")}
              className="h-9"
              value={foodData.price}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Хуучин үнэ
          </label>
          <Input
            type="number"
            placeholder={t("food.fields.old_price")}
            className="h-9"
            value={oldPrice}
            onChange={(e) => setOldPrice(e.target.value)}
          />
        </div>
      </div>

      {/* Section 2 — Details */}
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Тайлбар
          </label>
          <textarea
            name="ingredients"
            placeholder={t("food.fields.description")}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm min-h-[72px] resize-none"
            value={foodData.ingredients}
            onChange={handleChange}
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            id="featured"
            checked={isFeatured}
            onChange={(e) => setIsFeatured(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-primary"
          />
          <span className="text-sm">Онцлох</span>
        </label>
      </div>

      {/* Section 3 — Media Upload */}
      <div className="space-y-3">
        {/* Images */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Зурагнууд
          </label>
          <div
            onClick={() => imageInputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-lg p-3 hover:border-primary/40 hover:bg-muted/30 transition-all cursor-pointer flex items-center gap-3"
          >
            <div className="bg-muted rounded-md p-2 shrink-0">
              <Images className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">
                {images.length ? `${images.length} зураг сонгосон` : "Зурагнууд сонгох"}
              </p>
              <p className="text-xs text-muted-foreground">
                Олон зураг сонгох боломжтой
              </p>
            </div>
            <input
              type="file"
              multiple
              accept="image/*"
              ref={imageInputRef}
              className="hidden"
              onChange={handleImages}
            />
          </div>
          {imagePreviews.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {imagePreviews.map((src, i) => (
                <div
                  key={i}
                  className="relative w-12 h-12 rounded-md overflow-hidden border border-border"
                >
                  <img src={src} className="w-full h-full object-cover" alt="" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-0.5 right-0.5 bg-background/80 rounded-full p-0.5"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Thumbnail */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Thumbnail
          </label>
          <div
            onClick={() => thumbnailInputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-lg p-3 hover:border-primary/40 hover:bg-muted/30 transition-all cursor-pointer flex items-center gap-3"
          >
            <div className="bg-muted rounded-md p-2 shrink-0">
              <ImagePlus className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">
                {thumbnailFile ? thumbnailFile.name : "Thumbnail сонгох"}
              </p>
              <p className="text-xs text-muted-foreground">
                {thumbnailFile ? "Солихын тулд дарна уу" : "PNG, JPG, MP4 хүртэл 100MB"}
              </p>
            </div>
            <input
              type="file"
              accept="image/*,video/*"
              ref={thumbnailInputRef}
              className="hidden"
              onChange={handleThumbnail}
            />
          </div>
        </div>
      </div>

      {/* Section 4 — Sizes */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Хэмжээ
        </label>
        <div className="flex gap-2">
          <Input
            value={newSize}
            onChange={(e) => setNewSize(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addSize()}
            placeholder={t("food.fields.size")}
            className="h-9 flex-1"
          />
          <button
            type="button"
            onClick={addSize}
            className="h-9 w-9 shrink-0 rounded-md bg-primary text-primary-foreground flex items-center justify-center"
          >
            <Plus size={16} />
          </button>
        </div>
        {sizes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {sizes.map((s, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 bg-muted text-foreground text-xs px-2.5 py-1 rounded-full border border-border"
              >
                {s}
                <button type="button" onClick={() => removeSize(i)}>
                  <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
