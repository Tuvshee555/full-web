import axios from "axios";

/**
 * Shared API client for the whole app.
 *
 * Centralizes the backend base URL and auth header so we stop repeating
 * `${process.env.NEXT_PUBLIC_BACKEND_URL}/...` + manual `Authorization`
 * headers across every component. Prefer this over calling axios/fetch
 * directly:
 *
 *   import { api } from "@/lib/api";
 *   const { data } = await api.get(`/food/${id}`);
 *   await api.post("/order", payload);
 *
 * The bearer token (if the user is logged in) is attached automatically.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});
