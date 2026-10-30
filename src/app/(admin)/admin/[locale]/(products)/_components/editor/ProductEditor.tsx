"use client";

import { API_BASE_URL } from "@admin/lib/api";
import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { ArrowUpRight, Loader2, Plus, Trash2, X } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@admin/components/ui/sheet";
import { ConfirmDialog } from "@admin/components/ui/confirm-dialog";
import { Notice } from "@admin/components/ui/feedback";
import { Switch } from "@admin/components/ui/controls";
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

type ErrorKey = "productName" | "price" | "oldPrice" | "categoryId" | "photos" | "sizes";
type Errors = Partial<Record<ErrorKey, string>>;
/** Where each error's field lives, so the summary can jump to it. */
const ERROR_TARGET: Record<ErrorKey, string> = {
  photos: "pe-photos",
  productName: "pe-name",
  categoryId: "pe-cat",
  price: "pe-price",
  oldPrice: "pe-old",
  sizes: "pe-sizes",
};

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

/** The API answers in English; show the owner a sentence in their language instead. */
function saveErrorText(err: unknown, t: (key: string) => string, isEdit: boolean, phase: "upload" | "save") {
  // uploadMedia rethrows plain Errors, so the phase tells an upload failure apart.
  if (phase === "upload") return t("editor.errors.upload");
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const message = String(err.response?.data?.message || err.response?.data?.error || "");
    if (!err.response) return t("common.errors.offline");
    if (status === 401 || status === 403) return t("common.errors.signed_out");
    if (/inventory changed/i.test(message)) return t("editor.errors.stock_changed");
    if (/active order|order history|has orders/i.test(message)) return t("editor.errors.in_orders");
    if (/category not found/i.test(message)) return t("editor.errors.category_missing");
  }
  return t(isEdit ? "editor.errors.save_failed" : "editor.errors.create_failed");
}

export function ProductEditor({ open, onOpenChange, product, categories, defaultCategoryId, onSaved }: Props) {
  const { t, locale } = useI18n();
  const { token } = useAuth();
  const isEdit = Boolean(product?.id);

  const [form, setForm] = useState<Form>(() => initialForm(product, defaultCategoryId));
  const [photos, setPhotos] = useState<MediaItem[]>(() => initialPhotos(product));
  const [video, setVideo] = useState<MediaItem | null>(null);
  const [sizeDraft, setSizeDraft] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [showSummary, setShowSummary] = useState(false);
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
    setShowSummary(false);
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
    if (!form.productName.trim()) e.productName = t("editor.errors.name");
    if (!Number.isFinite(priceNum) || priceNum <= 0 || priceNum > 1_000_000_000) e.price = t("editor.errors.price");
    if (form.oldPrice && (!Number.isFinite(oldPriceNum) || oldPriceNum <= priceNum || oldPriceNum > 1_000_000_000)) e.oldPrice = t("editor.errors.old_price");
    if (!form.categoryId) e.categoryId = t("editor.errors.category");
    if (photos.length === 0) e.photos = t("editor.errors.photo");
    if (!validInventory(form.sizes)) e.sizes = t("editor.errors.stock");
    setErrors(e);
    return e;
  };

  const requestClose = (next: boolean) => {
    if (next) return onOpenChange(true);
    if (saving) return;
    if (dirty) return setConfirm("discard");
    onOpenChange(false);
  };

  const save = async () => {
    if (savingRef.current || !token) return;
    if (sizeDraft.trim()) {
      addSize();
      toast.message(t("editor.option_added"));
      return;
    }
    const found = validate();
    if (Object.keys(found).length) {
      setShowSummary(true);
      document.getElementById(ERROR_TARGET[Object.keys(found)[0] as ErrorKey])?.focus();
      return;
    }
    setShowSummary(false);
    let phase: "upload" | "save" = "upload";
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
      phase = "save";

      if (isEdit) {
        await axios.put(`${API_BASE_URL}/products/${String(product!.id)}`, payload, { headers });
        toast.success(t("editor.toast.saved", { name: payload.productName }));
      } else {
        await axios.post(`${API_BASE_URL}/products`, payload, { headers });
        toast.success(t("editor.toast.created", { name: payload.productName }));
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(saveErrorText(err, t, isEdit, phase));
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
      toast.success(t("editor.toast.deleted", { name: product?.productName ?? "" }));
      setConfirm(null);
      onSaved();
      onOpenChange(false);
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      toast.error(status === 409 ? t("editor.errors.delete_ordered") : t("editor.errors.delete_failed"));
      setConfirm(null);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const label = "admin-label";
  const err = (key: keyof Errors) =>
    errors[key] ? <p id={`${ERROR_TARGET[key]}-error`} className="admin-error">{errors[key]}</p> : null;
  const invalid = (key: keyof Errors) => ({
    "aria-invalid": Boolean(errors[key]),
    "aria-describedby": errors[key] ? `${ERROR_TARGET[key]}-error` : undefined,
  });
  const errorList = (Object.keys(errors) as ErrorKey[]).filter((key) => errors[key]);

  return (
    <Sheet open={open} onOpenChange={requestClose}>
      <SheetContent
        side="right"
        hideClose
        className="flex w-full flex-col gap-0 border-l border-ink/10 bg-paper p-0 sm:max-w-[min(980px,calc(100vw-48px))]"
        onPointerDownOutside={(e) => saving && e.preventDefault()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-[16px] border-b border-ink/10 bg-white px-[16px] py-[14px] sm:px-[24px]">
          <div className="min-w-0">
            <SheetTitle className="text-[20px] font-semibold tracking-tight">
              {isEdit ? t("editor.title_edit") : t("editor.title_new")}
            </SheetTitle>
            <SheetDescription className="mt-[2px] truncate text-[13px] text-taupe">
              {isEdit ? form.productName || "—" : t("editor.new_hint")}
            </SheetDescription>
          </div>
          <div className="flex shrink-0 items-center gap-[4px]">
            {isEdit && (
              <a href={`/${locale}/products/${String(product!.id)}`} target="_blank" rel="noreferrer" className="btn-ghost btn-sm">
                <span className="hidden sm:inline">{t("editor.view_in_shop")}</span>
                <ArrowUpRight aria-hidden className="h-[14px] w-[14px]" />
                <span className="sr-only sm:hidden">{t("editor.view_in_shop")}</span>
                <span className="sr-only">({t("common.opens_new_tab")})</span>
              </a>
            )}
            <button
              type="button"
              onClick={() => requestClose(false)}
              aria-label={t("common.close")}
              className="flex h-[44px] w-[44px] shrink-0 items-center justify-center text-taupe hover:bg-sand hover:text-ink"
            >
              <X aria-hidden className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-[16px] py-[20px] sm:px-[24px]">
          {showSummary && errorList.length > 0 && (
            <Notice tone="warning" role="alert" className="mb-[16px]" title={t("editor.errors.summary", { count: errorList.length })}>
              <ul className="mt-[4px] list-disc pl-[18px]">
                {errorList.map((key) => (
                  <li key={key}>
                    <button type="button" className="text-left underline underline-offset-2" onClick={() => document.getElementById(ERROR_TARGET[key])?.focus()}>
                      {errors[key]}
                    </button>
                  </li>
                ))}
              </ul>
            </Notice>
          )}
          <fieldset disabled={saving} className="grid min-w-0 gap-[20px] disabled:opacity-70 md:grid-cols-2">
            <section className="admin-surface min-w-0 p-[18px]">
              <h3 className="admin-section-title">{t("editor.section_photos")}</h3>
              <PhotosField
                disabled={saving}
                items={photos}
                inputId="pe-photos"
                onChange={(p) => {
                  setPhotos(p);
                  if (errors.photos) setErrors((e) => ({ ...e, photos: undefined }));
                }}
                error={errors.photos}
              />
            </section>

            <section className="admin-surface min-w-0 space-y-[18px] p-[18px]">
              <h3 className="admin-section-title">{t("editor.section_details")}</h3>
              <div>
                <label className={label} htmlFor="pe-name">{t("editor.name")}</label>
                <input
                  id="pe-name"
                  value={form.productName}
                  maxLength={200}
                  onChange={(e) => set("productName", e.target.value)}
                  placeholder={t("editor.name_placeholder")}
                  className="field"
                  {...invalid("productName")}
                />
                {err("productName")}
              </div>
              <div>
                <label className={label} htmlFor="pe-cat">{t("editor.category")}</label>
                <select
                  id="pe-cat"
                  value={form.categoryId}
                  onChange={(e) => set("categoryId", e.target.value)}
                  className="field"
                  {...invalid("categoryId")}
                >
                  <option value="" disabled>{t("editor.category_placeholder")}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {"   ".repeat(c.depth)}{c.name}
                    </option>
                  ))}
                </select>
                {err("categoryId")}
              </div>
              <div>
                <label className={label} htmlFor="pe-desc">
                  {t("editor.description")} <span className="font-normal text-taupe">({t("common.optional")})</span>
                </label>
                <textarea
                  id="pe-desc"
                  value={form.ingredients}
                  onChange={(e) => set("ingredients", e.target.value)}
                  placeholder={t("editor.description_placeholder")}
                  rows={5}
                  className="field resize-y"
                />
              </div>
            </section>

            <section className="admin-surface min-w-0 space-y-[18px] p-[18px]">
              <h3 className="admin-section-title">{t("editor.section_price")}</h3>
              <div className="grid grid-cols-1 gap-[16px] min-[900px]:grid-cols-2">
                <div>
                  <label className={label} htmlFor="pe-price">{t("editor.price")}</label>
                  <div className="relative">
                    <input
                      id="pe-price"
                      inputMode="numeric"
                      value={form.price}
                      onChange={(e) => set("price", digits(e.target.value))}
                      placeholder="0"
                      className="field pr-[32px] tabular-nums"
                      {...invalid("price")}
                    />
                    <span aria-hidden className="pointer-events-none absolute right-[12px] top-1/2 -translate-y-1/2 text-[14px] text-taupe">₮</span>
                  </div>
                  {err("price")}
                </div>
                <div>
                  <label className={label} htmlFor="pe-old">
                    {t("editor.old_price")} <span className="font-normal text-taupe">({t("common.optional")})</span>
                  </label>
                  <div className="relative">
                    <input
                      id="pe-old"
                      inputMode="numeric"
                      value={form.oldPrice}
                      onChange={(e) => set("oldPrice", digits(e.target.value))}
                      placeholder="—"
                      className="field pr-[32px] tabular-nums"
                      {...invalid("oldPrice")}
                    />
                    <span aria-hidden className="pointer-events-none absolute right-[12px] top-1/2 -translate-y-1/2 text-[14px] text-taupe">₮</span>
                  </div>
                  {err("oldPrice") ?? (
                    <p className="admin-hint">
                      {discount > 0 ? t("editor.sale_preview", { pct: discount }) : t("editor.old_price_hint")}
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="admin-surface min-w-0 space-y-[14px] p-[18px] md:row-span-2">
              <h3 className="admin-section-title">{t("editor.section_options")}</h3>
              <div>
                <label className={label} htmlFor="pe-sizes">{t("editor.sizes")}</label>
                <div className="flex gap-[8px]">
                  <input
                    id="pe-sizes"
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
                    className="field"
                    {...invalid("sizes")}
                  />
                  <button type="button" onClick={addSize} disabled={!sizeDraft.trim()} className="btn-secondary shrink-0 !px-[14px]">
                    <Plus aria-hidden className="h-[16px] w-[16px]" />
                    {t("editor.add_option")}
                  </button>
                </div>
                {form.sizes.length > 0 ? (
                  <>
                    <div className="mt-[12px] divide-y divide-ink/10 border border-ink/15 bg-white">
                      {form.sizes.map((size, index) => (
                        <div key={size.label} className="flex min-w-0 flex-wrap items-end gap-[10px] px-[12px] py-[8px]">
                          <span className="min-w-[96px] flex-1 self-center break-words text-[14px] font-medium text-ink">{size.label}</span>
                          <div className="w-[116px] shrink-0">
                            <label htmlFor={`pe-price-${index}`} className="mb-[4px] block text-[12px] text-taupe">{t("editor.price")}</label>
                            <input
                              id={`pe-price-${index}`}
                              inputMode="numeric"
                              value={size.price}
                              placeholder={form.price || "0"}
                              aria-label={t("editor.size_price", { size: size.label })}
                              className="field !px-[8px] text-right tabular-nums"
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
                              aria-label={t("editor.size_stock", { size: size.label })}
                              className="field !px-[8px] tabular-nums"
                              onChange={(event) => set("sizes", form.sizes.map((option, at) => at === index ? { ...option, stock: digits(event.target.value) } : option))}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => set("sizes", form.sizes.filter((_, at) => at !== index))}
                            aria-label={t("editor.remove_option", { size: size.label })}
                            title={t("editor.remove_option", { size: size.label })}
                            className="flex h-[44px] w-[44px] shrink-0 items-center justify-center text-taupe hover:bg-terracotta/10 hover:text-terracotta"
                          >
                            <Trash2 aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.6} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="admin-hint">{t("editor.size_price_hint")}</p>
                  </>
                ) : (
                  <p className="admin-hint">{t("editor.sizes_hint")}</p>
                )}
                <p className="admin-hint">{t("editor.stock_hint")}</p>
                {err("sizes")}
              </div>

              <Switch
                className="border-t border-ink/10 pt-[14px]"
                checked={form.isFeatured}
                onChange={(on) => set("isFeatured", on)}
                label={t("editor.featured")}
                description={t("editor.featured_hint")}
              />
            </section>

            <section className="admin-surface min-w-0 p-[18px]">
              <h3 className="admin-section-title">
                {t("editor.section_video")} <span className="font-normal text-taupe">({t("common.optional")})</span>
              </h3>
              <VideoField video={video} onChange={setVideo} />
            </section>
          </fieldset>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center gap-[8px] border-t border-ink/10 bg-white px-[16px] py-[12px] sm:px-[24px]">
          {isEdit && (
            <button
              type="button"
              onClick={() => setConfirm("delete")}
              disabled={saving}
              className="btn-ghost btn-danger-text mr-auto"
            >
              <Trash2 aria-hidden className="h-[16px] w-[16px]" strokeWidth={1.5} />
              <span className="hidden sm:inline">{t("editor.delete")}</span>
              <span className="sr-only sm:hidden">{t("editor.delete")}</span>
            </button>
          )}
          {dirty && !saving && <span className="hidden text-[13px] text-taupe md:inline">{t("editor.unsaved")}</span>}
          <button
            type="button"
            onClick={() => requestClose(false)}
            disabled={saving}
            className={`btn-secondary ${isEdit ? "" : "ml-auto"}`}
          >
            {t("common.cancel")}
          </button>
          <button type="button" onClick={save} disabled={saving} className="btn min-w-[140px]">
            {saving && <Loader2 aria-hidden className="h-[16px] w-[16px] animate-spin" />}
            {saving
              ? progress !== null && progress < 100
                ? t("editor.uploading", { pct: progress })
                : t("editor.saving")
              : isEdit
              ? t("editor.save")
              : t("editor.create")}
          </button>
        </div>

        <ConfirmDialog
          open={confirm === "discard"}
          onOpenChange={(next) => !next && setConfirm(null)}
          title={t("editor.discard.title")}
          description={t("editor.discard.body")}
          confirmLabel={t("editor.discard.confirm")}
          cancelLabel={t("editor.discard.keep")}
          tone="danger"
          onConfirm={() => {
            setConfirm(null);
            onOpenChange(false);
          }}
        />
        <ConfirmDialog
          open={confirm === "delete"}
          onOpenChange={(next) => !next && setConfirm(null)}
          title={t("editor.delete_confirm.title", { name: product?.productName ?? "" })}
          description={t("editor.delete_confirm.body")}
          confirmLabel={t("editor.delete_confirm.confirm")}
          tone="danger"
          busy={saving}
          onConfirm={() => void remove()}
        />
      </SheetContent>
    </Sheet>
  );
}
