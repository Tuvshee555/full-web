import axios from "axios";

/**
 * Shared API client for the whole admin app.
 *
 * Centralizes the backend base URL and auth header so we stop repeating
 * `${process.env.NEXT_PUBLIC_BACKEND_URL}/...` + manual `Authorization`
 * headers across every component. Prefer this over calling axios/fetch
 * directly:
 *
 *   import { api } from "@admin/lib/api";
 *   const { data } = await api.get("/order?mode=revenue");
 *   await api.post("/food", payload);
 *
 * The admin bearer token (if present) is attached automatically.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("adminToken");
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});
