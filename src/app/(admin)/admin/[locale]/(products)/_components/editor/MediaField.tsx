/* eslint-disable @next/next/no-img-element */
"use client";

import { useRef, useState } from "react";
import { ImagePlus, Star, Video, X } from "lucide-react";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";

/** A photo already on the CDN (url) or picked locally (file + blob preview url). */
export type MediaItem = { key: string; url: string; file?: File };

let seq = 0;
export const mediaFromFile = (file: File): MediaItem => ({
  key: `f${seq++}`,
  url: URL.createObjectURL(file),
  file,
});
export const mediaFromUrl = (url: string): MediaItem => ({ key: `u${seq++}`, url });

type PhotosProps = {
  items: MediaItem[];
  onChange: (items: MediaItem[]) => void;
  error?: string;
  disabled?: boolean;
  /** id of the "Add photos" button, so a validation summary can move focus to it. */
  inputId?: string;
};

/** Photo grid: first photo is the cover. Add by click or drag-and-drop. */
export function PhotosField({ items, onChange, error, disabled = false, inputId }: PhotosProps) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const add = (files: FileList | File[] | null) => {
    if (disabled) return;
    const images = Array.from(files ?? []).filter((f) => f.type.startsWith("image/"));
    if (images.length) onChange([...items, ...images.map(mediaFromFile)]);
  };

  const remove = (key: string) => onChange(items.filter((m) => m.key !== key));

  const makeCover = (key: string) => {
    const item = items.find((m) => m.key === key);
    if (item) onChange([item, ...items.filter((m) => m.key !== key)]);
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          add(e.dataTransfer.files);
        }}
        className={`grid grid-cols-2 gap-[10px] sm:grid-cols-4 ${dragging ? "outline outline-2 outline-offset-4 outline-ink/40" : ""}`}
      >
        {items.map((m, i) => (
          <div key={m.key} className="group relative aspect-square overflow-hidden bg-sand">
            <img src={m.url} alt="" className="h-full w-full object-cover" />
            {i === 0 ? (
              <span className="absolute bottom-[6px] left-[6px] flex items-center gap-[4px] bg-ink px-[7px] py-[3px] text-[11px] font-medium text-paper">
                <Star aria-hidden className="h-[11px] w-[11px] fill-paper" strokeWidth={1.6} />
                {t("editor.cover")}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => makeCover(m.key)}
                className="absolute bottom-[6px] left-[6px] min-h-[32px] bg-paper/95 px-[8px] text-[11px] font-medium text-ink transition-opacity hover:bg-paper [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100"
              >
                {t("editor.make_cover")}
              </button>
            )}
            <button
              type="button"
              onClick={() => remove(m.key)}
              aria-label={t("editor.remove_photo", { n: i + 1 })}
              title={t("editor.remove_photo", { n: i + 1 })}
              className="absolute right-[4px] top-[4px] flex h-[40px] w-[40px] items-center justify-center bg-paper/90 text-ink transition-colors hover:bg-terracotta hover:text-paper"
            >
              <X aria-hidden className="h-[15px] w-[15px]" />
            </button>
          </div>
        ))}

        <button
          type="button"
          id={inputId}
          onClick={() => inputRef.current?.click()}
          aria-describedby={inputId ? `${inputId}-message` : undefined}
          className={`flex aspect-square flex-col items-center justify-center gap-[6px] border border-dashed px-[8px] text-center transition-colors hover:border-ink hover:bg-sand/50 ${
            error ? "border-terracotta" : "border-ink/25"
          }`}
        >
          <ImagePlus className="h-[22px] w-[22px] text-taupe" strokeWidth={1.3} />
          <span className="text-[12px] font-medium text-ink">{t("editor.add_photos")}</span>
          <span className="hidden text-[11px] leading-tight text-taupe sm:block">{t("editor.drop_hint")}</span>
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          add(e.target.files);
          e.target.value = "";
        }}
      />

      {error ? (
        <p id={inputId ? `${inputId}-message` : undefined} className="admin-error">{error}</p>
      ) : (
        <p id={inputId ? `${inputId}-message` : undefined} className="admin-hint">{t("editor.photos_hint")}</p>
      )}
    </div>
  );
}

type VideoProps = {
  video: MediaItem | null;
  onChange: (video: MediaItem | null) => void;
};

export function VideoField({ video, onChange }: VideoProps) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      {video ? (
        <div className="relative bg-ink">
          <video src={video.url} className="max-h-[220px] w-full object-contain" controls />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute right-[8px] top-[8px] flex min-h-[44px] items-center gap-[6px] bg-paper/90 px-[10px] text-[12px] text-ink hover:bg-terracotta hover:text-paper"
          >
            <X aria-hidden className="h-[14px] w-[14px]" />
            {t("editor.remove_video")}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center gap-[12px] border border-dashed border-ink/25 px-[14px] py-[14px] text-left transition-colors hover:border-ink hover:bg-sand/50"
        >
          <Video className="h-[20px] w-[20px] shrink-0 text-taupe" strokeWidth={1.3} />
          <span>
            <span className="block text-[13px] font-medium text-ink">{t("editor.add_video")}</span>
            <span className="block text-[12px] text-taupe">{t("editor.video_hint")}</span>
          </span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onChange(mediaFromFile(file));
          e.target.value = "";
        }}
      />
    </div>
  );
}
