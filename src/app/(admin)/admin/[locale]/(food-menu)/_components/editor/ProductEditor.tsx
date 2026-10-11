"use client";

import { API_BASE_URL } from "@admin/lib/api";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@admin/components/ui/sheet";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { useAuth } from "@admin/provider/AuthProvider";
import { uploadMedia } from "@admin/utils/uploadMedia";
import { shrinkImage } from "@admin/utils/shrinkImage";
import { FoodType } from "@admin/type/type";
import { MediaItem, PhotosField, VideoField, mediaFromUrl } from "./MediaField";

export type CategoryOption = { id: string; name: string; depth: number };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Product to edit; null/undefined = create a new one. */
  food?: FoodType | null;
  categories: CategoryOption[];
  defaultCategoryId?: string | null;
  onSaved: () => void;
};

type Form = {
  foodName: string;
  price: string;
  oldPrice: string;
  ingredients: string;
  categoryId: string;
  isFeatured: boolean;
  sizes: string[];
};

type Errors = Partial<Record<"foodName" | "price" | "oldPrice" | "categoryId" | "photos", string>>;

const digits = (v: string) => v.replace(/[^\d]/g, "");

const sizeLabel = (s: unknown) =>
  typeof s === "object" && s !== null ? String((s as { label?: string }).label ?? "") : String(s);

function initialForm(food: FoodType | null | undefined, defaultCategoryId?: string | null): Form {
  const price = Number(food?.price ?? 0);
  const oldPrice = Number(food?.oldPrice ?? 0);
  return {
    foodName: food?.foodName ?? "",
    price: food ? String(Math.round(price)) : "",
    // An oldPrice equal to price means "no sale"; show it as empty
    oldPrice: oldPrice > price ? String(Math.round(oldPrice)) : "",
    ingredients: food?.ingredients ?? "",
    categoryId: food?.categoryId ?? defaultCategoryId ?? "",
    isFeatured: Boolean(food?.isFeatured),
    sizes: Array.isArray(food?.sizes) ? food!.sizes.map(sizeLabel).filter(Boolean) : [],
  };
}

function initialPhotos(food?: FoodType | null): MediaItem[] {
  if (!food) return [];
  const urls = [food.image, ...(food.extraImages ?? [])].filter(
    (u): u is string => typeof u === "string" && u.trim().length > 0
  );
  return urls.map(mediaFromUrl);
}

export function ProductEditor({ open, onOpenChange, food, categories, defaultCategoryId, onSaved }: Props) {
  const { t } = useI18n();
  const { token } = useAuth();
  const isEdit = Boolean(food?.id);

  const [form, setForm] = useState<Form>(() => initialForm(food, defaultCategoryId));
  const [photos, setPhotos] = useState<MediaItem[]>(() => initialPhotos(food));
  const [video, setVideo] = useState<MediaItem | null>(null);
  const [sizeDraft, setSizeDraft] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<"discard" | "delete" | null>(null);
  const [snapshot, setSnapshot] = useState("");

  // Reset whenever the sheet opens for a (different) product
  useEffect(() => {
    if (!open) return;
    const f = initialForm(food, defaultCategoryId);
    const p = initialPhotos(food);
    const v = typeof food?.video === "string" && food.video ? mediaFromUrl(food.video) : null;
    setForm(f);
    setPhotos(p);
    setVideo(v);
    setSizeDraft("");
    setErrors({});
    setConfirm(null);
    setProgress(null);
    setSnapshot(JSON.stringify([f, p.map((m) => m.url), v?.url ?? null]));
  }, [open, food, defaultCategoryId]);

  // Free blob previews of picked files when the editor closes
  useEffect(() => {
    if (open) return;
    return () => {
      photos.forEach((m) => m.file && URL.revokeObjectURL(m.url));
      if (video?.file) URL.revokeObjectURL(video.url);
    };
  }, [open, photos, video]);

  const dirty = useMemo(
    () => snapshot !== "" && snapshot !== JSON.stringify([form, photos.map((m) => m.url), video?.url ?? null]),
    [snapshot, form, photos, video]
  );

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((p) => ({ ...p, [key]: value }));
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const priceNum = Number(form.price || 0);
  const oldPriceNum = Number(form.oldPrice || 0);
  const discount = oldPriceNum > priceNum && priceNum > 0 ? Math.round((1 - priceNum / oldPriceNum) * 100) : 0;

  const addSize = () => {
    const v = sizeDraft.trim();
    if (!v) return;
    if (!form.sizes.includes(v)) set("sizes", [...form.sizes, v]);
    setSizeDraft("");
  };

  const validate = () => {
    const e: Errors = {};
    if (!form.foodName.trim()) e.foodName = t("food.validation.name");
    if (!priceNum || priceNum <= 0) e.price = t("food.validation.price");
    if (form.oldPrice && oldPriceNum <= priceNum) e.oldPrice = t("editor.old_price_rule");
    if (!form.categoryId) e.categoryId = t("editor.category_required");
    if (photos.length === 0) e.photos = t("editor.photo_required");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const requestClose = (next: boolean) => {
    if (next) return onOpenChange(true);
    if (saving) return;
    if (dirty && confirm !== "discard") return setConfirm("discard");
    onOpenChange(false);
  };

  const save = async () => {
    if (!validate()) {
      toast.error(t("editor.fix_errors"));
      return;
    }
    try {
      setSaving(true);

      // Upload new files one per request (keeps each under Vercel's body limit),
      // then rebuild the photo list in display order
      const newFiles = [...photos.filter((m) => m.file).map((m) => m.file!), ...(video?.file ? [video.file] : [])];
      const uploaded: string[] = [];
      for (let n = 0; n < newFiles.length; n++) {
        setProgress(Math.round((n / newFiles.length) * 100));
        const file = await shrinkImage(newFiles[n]);
        const [url] = await uploadMedia([file], (pct) =>
          setProgress(Math.round(((n + pct / 100) / newFiles.length) * 100))
        );
        uploaded.push(url);
      }
      let i = 0;
      const photoUrls = photos.map((m) => (m.file ? uploaded[i++] : m.url));
      const videoUrl = video ? (video.file ? uploaded[i++] : video.url) : "";

      const payload = {
        foodName: form.foodName.trim(),
        price: priceNum,
        // Clearing the old price must actually clear the sale: send it equal to the price
        oldPrice: form.oldPrice ? oldPriceNum : priceNum,
        discount,
        ingredients: form.ingredients.trim(),
        categoryId: form.categoryId,
        isFeatured: form.isFeatured,
        sizes: form.sizes,
        image: photoUrls[0],
        extraImages: photoUrls.slice(1),
        video: videoUrl,
      };
      const headers = { Authorization: `Bearer ${token}` };

      if (isEdit) {
        await axios.put(`${API_BASE_URL}/food/${String(food!.id)}`, payload, { headers });
        toast.success(t("updated"));
      } else {
        await axios.post(`${API_BASE_URL}/food`, payload, { headers });
        toast.success(t("food.toast.success"));
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.message || err.response?.data?.error || err.message
        : err instanceof Error
        ? err.message
        : "";
      toast.error(msg || (isEdit ? t("update_failed") : t("food.toast.error")));
    } finally {
      setSaving(false);
      setProgress(null);
    }
  };

  const remove = async () => {
    try {
      setSaving(true);
      await axios.delete(`${API_BASE_URL}/food/${String(food!.id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(t("deleted"));
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error(t("editor.delete_failed"));
    } finally {
      setSaving(false);
      setConfirm(null);
    }
  };

  const label = "mb-[8px] block text-[13px] font-medium text-ink";
  const field =
    "h-[44px] w-full border bg-white px-[12px] text-[14px] text-ink outline-none transition-colors placeholder:text-ink/35 focus:border-ink";
  const border = (key: keyof Errors) => (errors[key] ? "border-terracotta" : "border-ink/20");
  const err = (key: keyof Errors) =>
    errors[key] ? <p className="mt-[6px] text-[12px] text-terracotta">{errors[key]}</p> : null;

  return (
    <Sheet open={open} onOpenChange={requestClose}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-l border-ink/10 bg-paper p-0 sm:max-w-[620px] [&>button]:hidden"
        onPointerDownOutside={(e) => saving && e.preventDefault()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-[16px] border-b border-ink/10 px-[24px] py-[20px]">
          <div className="min-w-0">
            <SheetTitle className="store-heading text-[28px]">
              {isEdit ? t("edit_food") : t("food.add_modal.title")}
            </SheetTitle>
            <SheetDescription className="mt-[4px] truncate text-[13px] text-taupe">
              {isEdit ? form.foodName || "—" : t("editor.new_hint")}
            </SheetDescription>
          </div>
          <button
            type="button"
            onClick={() => requestClose(false)}
            aria-label={t("close")}
            className="-mr-[8px] flex h-[40px] w-[40px] shrink-0 items-center justify-center text-ink/60 hover:bg-sand hover:text-ink"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-[24px] py-[24px]">
          <div className="space-y-[32px]">
            <section>
              <h3 className="eyebrow mb-[14px]">{t("editor.section_photos")}</h3>
              <PhotosField
                items={photos}
                onChange={(p) => {
                  setPhotos(p);
                  if (errors.photos) setErrors((e) => ({ ...e, photos: undefined }));
                }}
                error={errors.photos}
              />
            </section>

            <section className="space-y-[18px]">
              <h3 className="eyebrow">{t("editor.section_details")}</h3>
              <div>
                <label className={label} htmlFor="pe-name">{t("editor.name")}</label>
                <input
                  id="pe-name"
                  value={form.foodName}
                  onChange={(e) => set("foodName", e.target.value)}
                  placeholder={t("food.fields.name")}
                  className={`${field} ${border("foodName")}`}
                />
                {err("foodName")}
              </div>
              <div>
                <label className={label} htmlFor="pe-cat">{t("category.title")}</label>
                <select
                  id="pe-cat"
                  value={form.categoryId}
                  onChange={(e) => set("categoryId", e.target.value)}
                  className={`${field} ${border("categoryId")} cursor-pointer`}
                >
                  <option value="" disabled>{t("select_category")}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {"   ".repeat(c.depth)}{c.name}
                    </option>
                  ))}
                </select>
                {err("categoryId")}
              </div>
              <div>
                <label className={label} htmlFor="pe-desc">{t("editor.description")}</label>
                <textarea
                  id="pe-desc"
                  value={form.ingredients}
                  onChange={(e) => set("ingredients", e.target.value)}
                  placeholder={t("editor.description_placeholder")}
                  rows={5}
                  className="w-full resize-y border border-ink/20 bg-white px-[12px] py-[10px] text-[14px] leading-[1.6] text-ink outline-none placeholder:text-ink/35 focus:border-ink"
                />
              </div>
            </section>

            <section className="space-y-[18px]">
              <h3 className="eyebrow">{t("editor.section_price")}</h3>
              <div className="grid grid-cols-1 gap-[16px] sm:grid-cols-2">
                <div>
                  <label className={label} htmlFor="pe-price">{t("editor.price")}</label>
                  <div className="relative">
                    <input
                      id="pe-price"
                      inputMode="numeric"
                      value={form.price}
                      onChange={(e) => set("price", digits(e.target.value))}
                      placeholder="0"
                      className={`${field} ${border("price")} pr-[32px] tabular-nums`}
                    />
                    <span className="pointer-events-none absolute right-[12px] top-1/2 -translate-y-1/2 text-[14px] text-taupe">₮</span>
                  </div>
                  {err("price")}
                </div>
                <div>
                  <label className={label} htmlFor="pe-old">
                    {t("editor.old_price")} <span className="font-normal text-taupe">({t("editor.optional")})</span>
                  </label>
                  <div className="relative">
                    <input
                      id="pe-old"
                      inputMode="numeric"
                      value={form.oldPrice}
                      onChange={(e) => set("oldPrice", digits(e.target.value))}
                      placeholder="—"
                      className={`${field} ${border("oldPrice")} pr-[32px] tabular-nums`}
                    />
                    <span className="pointer-events-none absolute right-[12px] top-1/2 -translate-y-1/2 text-[14px] text-taupe">₮</span>
                  </div>
                  {err("oldPrice") ?? (
                    <p className="mt-[6px] text-[12px] text-taupe">
                      {discount > 0 ? t("editor.sale_preview", { pct: discount }) : t("editor.old_price_hint")}
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="space-y-[14px]">
              <h3 className="eyebrow">{t("editor.section_options")}</h3>
              <div>
                <span className={label}>{t("editor.sizes")}</span>
                <div className="flex gap-[8px]">
                  <input
                    value={sizeDraft}
                    onChange={(e) => setSizeDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSize();
                      }
                    }}
                    placeholder={t("editor.sizes_placeholder")}
                    className={`${field} border-ink/20`}
                  />
                  <button
                    type="button"
                    onClick={addSize}
                    className="btn-secondary !min-h-[44px] shrink-0 !px-[16px]"
                  >
                    <Plus className="h-[16px] w-[16px]" />
                    {t("common.add")}
                  </button>
                </div>
                {form.sizes.length > 0 ? (
                  <div className="mt-[10px] flex flex-wrap gap-[6px]">
                    {form.sizes.map((s) => (
                      <span key={s} className="inline-flex h-[32px] items-center gap-[6px] bg-sand pl-[12px] pr-[4px] text-[13px] text-ink">
                        {s}
                        <button
                          type="button"
                          onClick={() => set("sizes", form.sizes.filter((x) => x !== s))}
                          aria-label={t("editor.remove")}
                          className="flex h-[24px] w-[24px] items-center justify-center text-ink/50 hover:text-terracotta"
                        >
                          <X className="h-[13px] w-[13px]" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-[6px] text-[12px] text-taupe">{t("editor.sizes_hint")}</p>
                )}
              </div>

              <label className="flex cursor-pointer items-start justify-between gap-[16px] border border-ink/15 bg-white px-[16px] py-[14px]">
                <span>
                  <span className="block text-[14px] font-medium text-ink">{t("food.fields.featured")}</span>
                  <span className="mt-[2px] block text-[12px] text-taupe">{t("editor.featured_hint")}</span>
                </span>
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(e) => set("isFeatured", e.target.checked)}
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  className={`relative mt-[2px] h-[24px] w-[42px] shrink-0 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ink/40 ${
                    form.isFeatured ? "bg-ink" : "bg-ink/20"
                  }`}
                >
                  <span
                    className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-paper transition-[left] ${
                      form.isFeatured ? "left-[21px]" : "left-[3px]"
                    }`}
                  />
                </span>
              </label>
            </section>

            <section>
              <h3 className="eyebrow mb-[14px]">
                {t("editor.section_video")} <span className="normal-case tracking-normal">({t("editor.optional")})</span>
              </h3>
              <VideoField video={video} onChange={setVideo} />
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-ink/10 bg-paper px-[24px] py-[16px]">
          {confirm === "discard" ? (
            <div className="flex flex-col gap-[12px] sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[13px] text-ink">{t("editor.discard_question")}</p>
              <div className="flex gap-[8px]">
                <button type="button" onClick={() => setConfirm(null)} className="btn-secondary flex-1 sm:flex-none">
                  {t("editor.keep_editing")}
                </button>
                <button type="button" onClick={() => onOpenChange(false)} className="btn flex-1 !bg-terracotta sm:flex-none">
                  {t("editor.discard")}
                </button>
              </div>
            </div>
          ) : confirm === "delete" ? (
            <div className="flex flex-col gap-[12px] sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[13px] text-ink">{t("delete_food_title")}</p>
              <div className="flex gap-[8px]">
                <button type="button" onClick={() => setConfirm(null)} disabled={saving} className="btn-secondary flex-1 sm:flex-none">
                  {t("common.cancel")}
                </button>
                <button type="button" onClick={remove} disabled={saving} className="btn flex-1 !bg-terracotta sm:flex-none">
                  {saving && <Loader2 className="h-[16px] w-[16px] animate-spin" />}
                  {t("confirm_delete")}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-[8px]">
              {isEdit && (
                <button
                  type="button"
                  onClick={() => setConfirm("delete")}
                  disabled={saving}
                  className="mr-auto flex h-[44px] items-center gap-[8px] px-[10px] text-[13px] text-terracotta hover:bg-terracotta/10 disabled:opacity-40"
                >
                  <Trash2 className="h-[16px] w-[16px]" strokeWidth={1.5} />
                  <span className="hidden sm:inline">{t("confirm_delete")}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => requestClose(false)}
                disabled={saving}
                className={`btn-secondary ${isEdit ? "" : "ml-auto"}`}
              >
                {t("common.cancel")}
              </button>
              <button type="button" onClick={save} disabled={saving} className="btn min-w-[140px]">
                {saving && <Loader2 className="h-[16px] w-[16px] animate-spin" />}
                {saving
                  ? progress !== null && progress < 100
                    ? t("editor.uploading", { pct: progress })
                    : t("editor.saving")
                  : isEdit
                  ? t("common.save")
                  : t("editor.create")}
              </button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
