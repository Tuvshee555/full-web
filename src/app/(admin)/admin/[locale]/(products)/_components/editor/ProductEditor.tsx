"use client";

import { API_BASE_URL } from "@admin/lib/api";
import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@admin/components/ui/sheet";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { useAuth } from "@admin/provider/AuthProvider";
import { uploadMedia } from "@admin/utils/uploadMedia";
import { shrinkImage } from "@admin/utils/shrinkImage";
import { ProductType } from "@admin/type/type";
import { inventoryOptions, inventoryPayload, InventoryOption, validInventory } from "@admin/utils/inventory";
import { MediaItem, PhotosField, VideoField, mediaFromUrl } from "./MediaField";

export type CategoryOption = { id: string; name: string; depth: number };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Product to edit; null/undefined = create a new one. */
  product?: ProductType | null;
  categories: CategoryOption[];
  defaultCategoryId?: string | null;
  onSaved: () => void;
};

type Form = {
  productName: string;
  price: string;
  oldPrice: string;
  ingredients: string;
  categoryId: string;
  isFeatured: boolean;
  /** price: the size's own price as digits, "" = same as the product price */
  sizes: (InventoryOption & { price: string })[];
};

type Errors = Partial<Record<"productName" | "price" | "oldPrice" | "categoryId" | "photos" | "sizes", string>>;

const digits = (v: string) => v.replace(/[^\d]/g, "");

/** A size's own price as digits for the form; "" when it sells at the product price. */
function ownPriceText(sizes: unknown, label: string): string {
  if (!Array.isArray(sizes)) return "";
  const match = sizes.find((s) => s && typeof s === "object" && (s as { label?: unknown }).label === label) as { price?: number | null } | undefined;
  const own = Number(match?.price);
  return match?.price != null && Number.isFinite(own) && own > 0 ? String(Math.round(own)) : "";
}

function initialForm(product: ProductType | null | undefined, defaultCategoryId?: string | null): Form {
  const price = Number(product?.price ?? 0);
  const oldPrice = Number(product?.oldPrice ?? 0);
  return {
    productName: product?.productName ?? "",
    price: product ? String(Math.round(price)) : "",
    // An oldPrice equal to price means "no sale"; show it as empty
    oldPrice: oldPrice > price ? String(Math.round(oldPrice)) : "",
    ingredients: product?.ingredients ?? "",
    categoryId: product?.categoryId ?? defaultCategoryId ?? "",
    isFeatured: Boolean(product?.isFeatured),
    sizes: inventoryOptions(product?.sizes).map((option) => ({ ...option, price: ownPriceText(product?.sizes, option.label) })),
  };
}

function initialPhotos(product?: ProductType | null): MediaItem[] {
  if (!product) return [];
  const urls = [product.image, ...(product.extraImages ?? [])].filter(
    (u): u is string => typeof u === "string" && u.trim().length > 0
  );
  return urls.map(mediaFromUrl);
}

export function ProductEditor({ open, onOpenChange, product, categories, defaultCategoryId, onSaved }: Props) {
  const { t } = useI18n();
  const { token } = useAuth();
  const isEdit = Boolean(product?.id);

  const [form, setForm] = useState<Form>(() => initialForm(product, defaultCategoryId));
  const [photos, setPhotos] = useState<MediaItem[]>(() => initialPhotos(product));
  const [video, setVideo] = useState<MediaItem | null>(null);
  const [sizeDraft, setSizeDraft] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<"discard" | "delete" | null>(null);
  const [snapshot, setSnapshot] = useState("");
  const savingRef = useRef(false);
  const previewUrls = useRef(new Set<string>());

  useEffect(() => {
    for (const media of [...photos, ...(video ? [video] : [])]) {
      if (media.file) previewUrls.current.add(media.url);
    }
  }, [photos, video]);

  // Reset whenever the sheet opens for a (different) product
  useEffect(() => {
    if (!open) return;
    const f = initialForm(product, defaultCategoryId);
    const p = initialPhotos(product);
    const v = typeof product?.video === "string" && product.video ? mediaFromUrl(product.video) : null;
    setForm(f);
    setPhotos(p);
    setVideo(v);
    setSizeDraft("");
    setErrors({});
    setConfirm(null);
    setProgress(null);
    setSnapshot(JSON.stringify([f, p.map((m) => m.url), v?.url ?? null]));
  }, [open, product, defaultCategoryId]);

  // Free blob previews of picked files when the editor closes
  useEffect(() => {
    if (open) return;
    previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrls.current.clear();
  }, [open]);
  useEffect(() => () => {
    previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

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
    if (!form.sizes.some((size) => size.label.toLocaleLowerCase() === v.toLocaleLowerCase())) {
      set("sizes", [...form.sizes, { label: v, stock: "", price: "" }]);
    }
    setSizeDraft("");
  };

  const validate = () => {
    const e: Errors = {};
    if (!form.productName.trim()) e.productName = t("product.validation.name");
    if (!Number.isFinite(priceNum) || priceNum <= 0 || priceNum > 1_000_000_000) e.price = t("product.validation.price");
    if (form.oldPrice && (!Number.isFinite(oldPriceNum) || oldPriceNum <= priceNum || oldPriceNum > 1_000_000_000)) e.oldPrice = t("editor.old_price_rule");
    if (!form.categoryId) e.categoryId = t("editor.category_required");
    if (photos.length === 0) e.photos = t("editor.photo_required");
    if (!validInventory(form.sizes)) e.sizes = t("editor.stock_rule");
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
    if (savingRef.current || !token) return;
    if (sizeDraft.trim()) {
      addSize();
      toast.error(t("editor.variant_draft_hint"));
      return;
    }
    if (!validate()) {
      toast.error(t("editor.fix_errors"));
      return;
    }
    try {
      savingRef.current = true;
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
        productName: form.productName.trim(),
        price: priceNum,
        // Clearing the old price must actually clear the sale: send it equal to the price
        oldPrice: form.oldPrice ? oldPriceNum : priceNum,
        discount,
        ingredients: form.ingredients.trim(),
        categoryId: form.categoryId,
        isFeatured: form.isFeatured,
        // inventoryPayload keeps the order of form.sizes, so index i is the same size
        sizes: inventoryPayload(form.sizes, product?.sizes).map((update, i) => ({
          ...update,
          price: form.sizes[i].price ? Number(form.sizes[i].price) : null,
        })),
        image: photoUrls[0],
        extraImages: photoUrls.slice(1),
        video: videoUrl,
      };
      const headers = { Authorization: `Bearer ${token}` };

      if (isEdit) {
        await axios.put(`${API_BASE_URL}/products/${String(product!.id)}`, payload, { headers });
        toast.success(t("updated"));
      } else {
        await axios.post(`${API_BASE_URL}/products`, payload, { headers });
        toast.success(t("product.toast.success"));
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.message || err.response?.data?.error || err.message
        : err instanceof Error
        ? err.message
        : "";
      toast.error(msg || (isEdit ? t("update_failed") : t("product.toast.error")));
    } finally {
      savingRef.current = false;
      setSaving(false);
      setProgress(null);
    }
  };

  const remove = async () => {
    if (savingRef.current || !token) return;
    try {
      savingRef.current = true;
      setSaving(true);
      await axios.delete(`${API_BASE_URL}/products/${String(product!.id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(t("deleted"));
      onSaved();
      onOpenChange(false);
    } catch (error) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message || error.response?.data?.error : null;
      toast.error(message || t("editor.delete_failed"));
    } finally {
      savingRef.current = false;
      setSaving(false);
      setConfirm(null);
    }
  };

  const label = "mb-[8px] block text-[13px] font-medium text-ink";
  const field =
    "h-[44px] w-full border bg-white px-[12px] text-[14px] text-ink outline-none transition-colors placeholder:text-ink/60 focus:border-ink";
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
              {isEdit ? t("edit_product") : t("product.add_modal.title")}
            </SheetTitle>
            <SheetDescription className="mt-[4px] truncate text-[13px] text-taupe">
              {isEdit ? form.productName || "—" : t("editor.new_hint")}
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
        <div className="min-h-0 flex-1 overflow-y-auto px-[16px] py-[24px] sm:px-[24px]">
          <fieldset disabled={saving} className="min-w-0 space-y-[32px] disabled:opacity-70">
            <section>
              <h3 className="eyebrow mb-[14px]">{t("editor.section_photos")}</h3>
              <PhotosField
                disabled={saving}
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
                  value={form.productName}
                  onChange={(e) => set("productName", e.target.value)}
                  placeholder={t("product.fields.name")}
                  className={`${field} ${border("productName")}`}
                />
                {err("productName")}
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
                  className="w-full resize-y border border-ink/20 bg-white px-[12px] py-[10px] text-[14px] leading-[1.6] text-ink outline-none placeholder:text-ink/60 focus:border-ink"
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
                    aria-label={t("editor.sizes")}
                    maxLength={60}
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
                  <>
                    <div className="mt-[12px] divide-y divide-ink/10 border border-ink/15 bg-white">
                      {form.sizes.map((size, index) => (
                        <div key={size.label} className="flex min-w-0 flex-wrap items-end gap-[10px] px-[12px] py-[8px]">
                          <span className="min-w-[96px] flex-1 self-center break-words text-[14px] text-ink">{size.label}</span>
                          <div className="w-[116px] shrink-0">
                            <label htmlFor={`pe-price-${index}`} className="mb-[4px] block text-[12px] text-taupe">{t("editor.price")}</label>
                            <input
                              id={`pe-price-${index}`}
                              inputMode="numeric"
                              value={size.price}
                              placeholder={form.price || "0"}
                              aria-label={t("editor.size_price", { size: size.label })}
                              className={`${field} border-ink/20 !px-[8px] text-right tabular-nums`}
                              onChange={(event) => set("sizes", form.sizes.map((option, at) => at === index ? { ...option, price: digits(event.target.value) } : option))}
                            />
                          </div>
                          <div className="w-[116px] shrink-0">
                            <label htmlFor={`pe-stock-${index}`} className="mb-[4px] block text-[12px] text-taupe">{t("editor.stock")}</label>
                            <input
                              id={`pe-stock-${index}`}
                              inputMode="numeric"
                              value={size.stock}
                              placeholder={t("editor.untracked")}
                              aria-label={`${size.label}: ${t("editor.stock")}`}
                              className={`${field} border-ink/20 !px-[8px] tabular-nums`}
                              onChange={(event) => set("sizes", form.sizes.map((option, at) => at === index ? { ...option, stock: digits(event.target.value) } : option))}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => set("sizes", form.sizes.filter((_, at) => at !== index))}
                            aria-label={`${t("editor.remove")}: ${size.label}`}
                            className="flex h-[44px] w-[44px] shrink-0 items-center justify-center text-taupe hover:text-terracotta"
                          >
                            <X className="h-[13px] w-[13px]" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="mt-[6px] text-[12px] text-taupe">{t("editor.size_price_hint")}</p>
                  </>
                ) : (
                  <p className="mt-[6px] text-[12px] text-taupe">{t("editor.sizes_hint")}</p>
                )}
                <p className="mt-[8px] text-[12px] leading-relaxed text-taupe">{t("editor.stock_hint")}</p>
                {err("sizes")}
              </div>

              <label className="flex cursor-pointer items-start justify-between gap-[16px] border border-ink/15 bg-white px-[16px] py-[14px]">
                <span>
                  <span className="block text-[14px] font-medium text-ink">{t("product.fields.featured")}</span>
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
          </fieldset>
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
              <p className="text-[13px] text-ink">{t("delete_product_title")}</p>
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
