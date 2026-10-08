/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { API_BASE_URL } from "@admin/lib/api";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { uploadMedia } from "@admin/utils/uploadMedia";
import { AddFoodForm } from "./AddFoodForm";
import { AddFoodFooter } from "./AddFoodFooter";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { useAuth } from "@admin/provider/AuthProvider";

interface FoodModelProps {
  category: { id: string; categoryName: string };
  closeModal: () => void;
  refreshFood: () => void;
}

export const AddFoodModel: React.FC<FoodModelProps> = ({
  category,
  closeModal,
  refreshFood,
}) => {
  const { t } = useI18n();
  const { token } = useAuth();

  const [foodData, setFoodData] = useState({
    foodName: "",
    price: "",
    ingredients: "",
    categoryId: category.id,
  });

  const [oldPrice, setOldPrice] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [sizes, setSizes] = useState<string[]>([]);
  const [isFeatured, setIsFeatured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const validateInputs = () => {
    if (!foodData.foodName.trim())
      return { ok: false, msg: t("food.validation.name") };

    const priceNum = Number(foodData.price);
    if (!foodData.price || Number.isNaN(priceNum) || priceNum <= 0)
      return { ok: false, msg: t("food.validation.price") };

    if (oldPrice) {
      const op = Number(oldPrice);
      if (Number.isNaN(op) || op <= 0)
        return { ok: false, msg: t("food.validation.old_price") };
    }

    return { ok: true };
  };

  // prevent background scroll while modal is open
  useEffect(() => {
    const original = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = original;
    };
  }, []);

  // generate previews when files change
  useEffect(() => {
    // images
    if (images.length) {
      const urls = images.map((f) => URL.createObjectURL(f));
      setImagePreviews(urls);
      // revoke on cleanup
      return () => {
        urls.forEach((u) => URL.revokeObjectURL(u));
      };
    } else {
      setImagePreviews([]);
    }
  }, [images]);

  useEffect(() => {
    if (video) {
      const url = URL.createObjectURL(video);
      setVideoPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setVideoPreview(null);
    }
  }, [video]);

  // focus the modal container for accessibility
  useEffect(() => {
    const el = containerRef.current;
    if (el) el.focus();
  }, []);

  const addFood = async () => {
    setErrorMsg(null);
    const valid = validateInputs();
    if (!valid.ok) {
      setErrorMsg(valid.msg ?? null);
      toast.error(valid.msg);
      return;
    }

    try {
      setLoading(true);

      // upload media via backend (will throw on failure)
      const uploadedImages = await uploadMedia(images);
      const uploadedVideo = video ? (await uploadMedia([video]))[0] : null;

      const payload: any = {
        foodName: foodData.foodName,
        price: Number(foodData.price),
        ingredients: foodData.ingredients,
        categoryId: foodData.categoryId,
        image: uploadedImages[0] || "",
        extraImages: uploadedImages.slice(1),
        video: uploadedVideo,
        sizes,
        isFeatured,
      };

      if (oldPrice) payload.oldPrice = Number(oldPrice);

      await axios.post(
        `${API_BASE_URL}/food`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(t("food.toast.success"));
      refreshFood();
      closeModal();
    } catch (err: any) {
      const msg = err?.message ?? t("food.toast.error");
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t("food.add_modal.title") || "Add food"}
    >
      <div
        ref={containerRef}
        tabIndex={-1}
        className="bg-card text-foreground p-6 rounded-2xl w-full max-w-md shadow-lg max-h-[90vh] overflow-y-auto"
      >
        <header className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {t("food.add_modal.title") || "Add new food"}
          </h2>
          <button
            aria-label={t("common.close") || "Close"}
            onClick={closeModal}
            className="ml-4 rounded-md px-3 py-1 hover:bg-muted/60"
          >
            ✕
          </button>
        </header>

        {errorMsg ? (
          <div className="mb-3 text-sm text-destructive">{errorMsg}</div>
        ) : null}

        <AddFoodForm
          category={category}
          foodData={foodData}
          setFoodData={setFoodData}
          oldPrice={oldPrice}
          setOldPrice={setOldPrice}
          images={images}
          setImages={setImages}
          imagePreviews={imagePreviews}
          setImagePreviews={setImagePreviews}
          setVideo={setVideo}
          videoPreview={videoPreview}
          setVideoPreview={setVideoPreview}
          sizes={sizes}
          setSizes={setSizes}
          isFeatured={isFeatured}
          setIsFeatured={setIsFeatured}
          closeModal={closeModal}
        />

        <AddFoodFooter
          loading={loading}
          onCancel={closeModal}
          onSubmit={addFood}
        />
      </div>
    </div>
  );
};
