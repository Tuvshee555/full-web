// src/utils/uploadMedia.ts
import { API_BASE_URL } from "@admin/lib/api";
import axios, { type AxiosProgressEvent } from "axios";

export type UploadProgressCallback = (percentage: number) => void;

export async function uploadMedia(
  files: File[],
  onProgress?: UploadProgressCallback
): Promise<string[]> {
  if (!files || files.length === 0) return [];

  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));

  const token =
    typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;

  try {
    const res = await axios.post(
      `${API_BASE_URL}/upload/media`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        timeout: 30_000,
        onUploadProgress: (progressEvent?: AxiosProgressEvent) => {
          if (!onProgress || !progressEvent?.total || !progressEvent?.loaded)
            return;
          const percent = Math.round(
            (Number(progressEvent.loaded) / Number(progressEvent.total)) * 100
          );
          onProgress(percent);
        },
      }
    );

    if (!res?.data?.urls) {
      throw new Error("Upload failed: no urls returned");
    }

    return res.data.urls as string[];
  } catch (err: unknown) {
    // normalize error message without using `any`
    let message = "Failed to upload media. Please try again.";
    if (axios.isAxiosError(err)) {
      const data = err.response?.data;
      if (data && typeof data === "object" && "message" in data) {
        const maybeMsg = (data as { message?: unknown }).message;
        if (typeof maybeMsg === "string") message = maybeMsg;
        else message = err.message || message;
      } else {
        message = err.message || message;
      }
    } else if (err instanceof Error) {
      message = err.message;
    }
    throw new Error(message);
  }
}
