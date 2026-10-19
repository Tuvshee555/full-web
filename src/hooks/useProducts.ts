// src/hooks/useProducts.ts
import { API_BASE_URL } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { ProductType } from "@/type/type";
import { sanitizeProductList } from "@/utils/catalogSanitizer";

export function useProducts(enabled = true) {
  return useQuery<ProductType[]>({
    queryKey: ["products"],
    queryFn: async ({ signal }) => {
      const { data } = await axios.get(
        `${API_BASE_URL}/products`, { signal, timeout: 15_000 }
      );
      if (!Array.isArray(data)) throw new Error("Invalid catalog response");
      return sanitizeProductList(data);
    },
    enabled,
    staleTime: 15_000,
    refetchInterval: 60_000,
    retry: 1,
    gcTime: 30 * 60_000,
  });
}
