/* eslint-disable @next/next/no-img-element */
"use client";

import { X, ImagePlus, Images, Video } from "lucide-react";
import { ChangeEvent, MutableRefObject, useRef, useState } from "react";
import { FoodFormState } from "@admin/type/type";

type Props = {
  updatedFood: FoodFormState;
  setUpdatedFood: React.Dispatch<React.SetStateAction<FoodFormState>>;

  mainPreview: string;
  setMainPreview: (v: string) => void;

  extraPreviews: string[];
  setExtraPreviews: React.Dispatch<React.SetStateAction<string[]>>;

  extraFiles: File[];
  setExtraFiles: React.Dispatch<React.SetStateAction<File[]>>;

  videoPreview: string;
  setVideoPreview: (v: string) => void;
  setVideoFile: (f: File | null) => void;

  createdUrls: MutableRefObject<string[]>;
  existingExtraCount: MutableRefObject<number>;
};

export default function FoodMediaFields({
  setUpdatedFood,
  mainPreview,
  setMainPreview,
  extraPreviews,
  setExtraPreviews,
  extraFiles,
  setExtraFiles,
  videoPreview,
  setVideoPreview,
  setVideoFile,
  createdUrls,
  existingExtraCount,
}: Props) {
  const mainImageRef = useRef<HTMLInputElement>(null);
  const extraImagesRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [localVideoFile, setLocalVideoFile] = useState<File | null>(null);

  const handleMainImage = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    createdUrls.current.push(url);
    setMainImageFile(file);
    setUpdatedFood((p) => ({ ...p, image: file }));
    setMainPreview(url);
  };

  const clearMainImage = () => {
    setMainPreview("");
    setMainImageFile(null);
    if (mainImageRef.current) mainImageRef.current.value = "";
  };

  const handleExtraImages = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const previews = files.map((f) => {
      const url = URL.createObjectURL(f);
      createdUrls.current.push(url);
      return url;
    });
    setExtraPreviews((p) => [...p, ...previews]);
    setExtraFiles((p) => [...p, ...files]);
    setUpdatedFood((p) => ({
      ...p,
      extraImages: [...(p.extraImages || []), ...files],
    }));
  };

  const removeExtra = (index: number) => {
    setExtraPreviews((p) => p.filter((_, i) => i !== index));
    if (index < existingExtraCount.current) {
      setUpdatedFood((p) => ({
        ...p,
        extraImages: (p.extraImages || []).filter((_, i) => i !== index),
      }));
      existingExtraCount.current--;
    } else {
      const fileIndex = index - existingExtraCount.current;
      const file = extraFiles[fileIndex];
      setExtraFiles((p) => p.filter((_, i) => i !== fileIndex));
      setUpdatedFood((p) => ({
        ...p,
        extraImages: (p.extraImages || []).filter(
          (x) =>
            !(x instanceof File && x.name === file.name && x.size === file.size)
        ),
      }));
    }
  };

  const handleVideo = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    createdUrls.current.push(url);
    setLocalVideoFile(file);
    setVideoFile(file);
    setVideoPreview(url);
    setUpdatedFood((p) => ({ ...p, video: file }));
  };

  return (
    <div className="space-y-4">
      {/* Main image */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Үндсэн зураг
        </label>
        <div
          onClick={() => mainImageRef.current?.click()}
          className="border-2 border-dashed border-border rounded-lg p-3 hover:border-primary/40 hover:bg-muted/30 transition-all cursor-pointer flex items-center gap-3"
        >
          <div className="bg-muted rounded-md p-2 shrink-0">
            <ImagePlus className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">
              {mainImageFile ? mainImageFile.name : "Зураг сонгох"}
            </p>
            <p className="text-xs text-muted-foreground">
              {mainImageFile ? "Солихын тулд дарна уу" : "PNG, JPG хүртэл 10MB"}
            </p>
          </div>
          <input
            type="file"
            ref={mainImageRef}
            className="hidden"
            accept="image/*"
            onChange={handleMainImage}
          />
        </div>
        {mainPreview && (
          <div className="relative w-16 h-16 rounded-md overflow-hidden border border-border">
            <img
              src={mainPreview}
              alt="preview"
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={clearMainImage}
              className="absolute top-0.5 right-0.5 bg-background/80 rounded-full p-0.5"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        )}
      </div>

      {/* Extra images */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Нэмэлт зурагнууд
        </label>
        <div
          onClick={() => extraImagesRef.current?.click()}
          className="border-2 border-dashed border-border rounded-lg p-3 hover:border-primary/40 hover:bg-muted/30 transition-all cursor-pointer flex items-center gap-3"
        >
          <div className="bg-muted rounded-md p-2 shrink-0">
            <Images className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">
              {extraFiles.length
                ? `${extraFiles.length} зураг сонгосон`
                : "Зурагнууд сонгох"}
            </p>
            <p className="text-xs text-muted-foreground">
              Олон зураг сонгох боломжтой
            </p>
          </div>
          <input
            type="file"
            ref={extraImagesRef}
            className="hidden"
            multiple
            accept="image/*"
            onChange={handleExtraImages}
          />
        </div>
        {extraPreviews.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {extraPreviews.map((src, i) => (
              <div
                key={i}
                className="relative w-12 h-12 rounded-md overflow-hidden border border-border"
              >
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeExtra(i)}
                  className="absolute top-0.5 right-0.5 bg-background/80 rounded-full p-0.5"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Video */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Видео (заавал биш)
        </label>
        <div
          onClick={() => videoRef.current?.click()}
          className="border-2 border-dashed border-border rounded-lg p-3 hover:border-primary/40 hover:bg-muted/30 transition-all cursor-pointer flex items-center gap-3"
        >
          <div className="bg-muted rounded-md p-2 shrink-0">
            <Video className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">
              {localVideoFile ? localVideoFile.name : "Видео сонгох"}
            </p>
            <p className="text-xs text-muted-foreground">
              MP4, MOV хүртэл 100MB
            </p>
          </div>
          <input
            type="file"
            ref={videoRef}
            className="hidden"
            accept="video/*"
            onChange={handleVideo}
          />
        </div>
        {videoPreview && (
          <video
            src={videoPreview}
            className="w-full max-h-[120px] object-cover rounded-md border border-border"
            controls
          />
        )}
      </div>
    </div>
  );
}
