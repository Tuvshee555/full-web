"use client";

import { API_BASE_URL } from "@admin/lib/api";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@admin/components/ui/dialog";
import { Button } from "@admin/components/ui/button";
import { uploadMedia } from "@admin/utils/uploadMedia";
import { FoodCardPropsType, FoodFormState } from "@admin/type/type";
import { useAuth } from "@admin/provider/AuthProvider";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";

import FoodBasicFields from "./FoodBasicFields";
import FoodFooterActions from "./FoodFooterActions";
import { SelectCategory } from "../SelectCategory";
import FoodMediaFields from "./FoodMediaFields";
import FoodSizeFields from "./FoodSizeFields";

export default function UpdateFoodButton({ food, refreshFood }: FoodCardPropsType) {
  const { token } = useAuth();
  const { t } = useI18n();

  const [updatedFood, setUpdatedFood] = useState<FoodFormState>(() => ({
    ...food,
    price: String(food.price ?? ""),
    oldPrice: food.oldPrice ? String(food.oldPrice) : "",
    discount: food.discount ? String(food.discount) : "",
    sizes: Array.isArray(food.sizes)
      ? food.sizes.map((s) => (typeof s === "object" && s !== null ? s.label : s))
      : [],
  }));

  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [mainPreview, setMainPreview] = useState("");
  const [extraPreviews, setExtraPreviews] = useState<string[]>([]);
  const [extraFiles, setExtraFiles] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState("");

  const createdUrls = useRef<string[]>([]);
  const existingExtraCount = useRef(0);

  useEffect(() => {
    setUpdatedFood({
      ...food,
      price: String(food.price ?? ""),
      oldPrice: food.oldPrice ? String(food.oldPrice) : "",
      discount: food.discount ? String(food.discount) : "",
      sizes: Array.isArray(food.sizes)
        ? food.sizes.map((s) => (typeof s === "object" && s !== null ? s.label : s))
        : [],
    });

    setMainPreview(typeof food.image === "string" ? food.image : "");
    setExtraPreviews(
      Array.isArray(food.extraImages)
        ? food.extraImages.filter((img): img is string => typeof img === "string")
        : []
    );
    setVideoPreview(typeof food.video === "string" ? food.video : "");
    existingExtraCount.current = food.extraImages?.length ?? 0;
    setConfirmDelete(false);
  }, [food]);

  useEffect(() => {
    return () => createdUrls.current.forEach(URL.revokeObjectURL);
  }, []);

  const updateData = async () => {
    try {
      setLoading(true);

      const image =
        updatedFood.image instanceof File
          ? (await uploadMedia([updatedFood.image]))[0]
          : updatedFood.image;

      const newExtras = extraFiles.length ? await uploadMedia(extraFiles) : [];

      const finalExtras = [
        ...(updatedFood.extraImages || []).filter((i) => typeof i === "string"),
        ...newExtras,
      ];

      const video = videoFile
        ? (await uploadMedia([videoFile]))[0]
        : updatedFood.video;

      await axios.put(
        `${API_BASE_URL}/food/${String(food.id)}`,
        {
          ...updatedFood,
          image,
          extraImages: finalExtras,
          video,
          price: Number(updatedFood.price),
          oldPrice: updatedFood.oldPrice ? Number(updatedFood.oldPrice) : undefined,
          discount: updatedFood.discount ? Number(updatedFood.discount) : undefined,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(t("updated"));
      refreshFood();
    } catch {
      toast.error(t("update_failed"));
    } finally {
      setLoading(false);
    }
  };

  const deleteFood = async () => {
    try {
      setLoading(true);
      await axios.delete(
        `${API_BASE_URL}/food/${String(food.id)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(t("deleted"));
      refreshFood();
    } finally {
      setLoading(false);
      setConfirmDelete(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="bg-background/90 backdrop-blur-sm border border-border rounded-md p-1.5 hover:bg-primary hover:text-primary-foreground transition-colors"
          aria-label={t("edit_food")}
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("edit_food")}</DialogTitle>
          <DialogDescription>{t("update_item_details")}</DialogDescription>
        </DialogHeader>

        {confirmDelete ? (
          /* Delete confirmation inline panel */
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 space-y-3">
            <p className="text-sm font-medium text-destructive">
              {t("delete_food_title")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("delete_food_description")}
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDelete(false)}
                disabled={loading}
              >
                {t("common.cancel")}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={deleteFood}
                disabled={loading}
              >
                {loading ? t("common.adding") : t("confirm_delete")}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <FoodBasicFields
              updatedFood={updatedFood}
              setUpdatedFood={setUpdatedFood}
            />

            <SelectCategory
              updatedFood={updatedFood}
              handleChange={(e) =>
                setUpdatedFood((p) => ({ ...p, categoryId: e.value }))
              }
            />

            <FoodMediaFields
              updatedFood={updatedFood}
              setUpdatedFood={setUpdatedFood}
              mainPreview={mainPreview}
              setMainPreview={setMainPreview}
              extraPreviews={extraPreviews}
              setExtraPreviews={setExtraPreviews}
              extraFiles={extraFiles}
              setExtraFiles={setExtraFiles}
              videoPreview={videoPreview}
              setVideoPreview={setVideoPreview}
              setVideoFile={setVideoFile}
              createdUrls={createdUrls}
              existingExtraCount={existingExtraCount}
            />

            <FoodSizeFields
              updatedFood={updatedFood}
              setUpdatedFood={setUpdatedFood}
            />

            <FoodFooterActions
              loading={loading}
              onSave={updateData}
              onDelete={() => setConfirmDelete(true)}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
