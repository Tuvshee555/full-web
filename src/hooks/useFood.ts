// src/hooks/useFoods.ts
import { API_BASE_URL } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { FoodType } from "@/type/type";
import { sanitizeFoodList } from "@/utils/catalogSanitizer";

export function useFood(enabled = true) {
  return useQuery<FoodType[]>({
    queryKey: ["foods"],
    queryFn: async ({ signal }) => {
      const { data } = await axios.get(
        `${API_BASE_URL}/food`, { signal, timeout: 15_000 }
      );
      if (!Array.isArray(data)) throw new Error("Invalid catalog response");
      return sanitizeFoodList(data);
    },
    enabled,
    staleTime: 15_000,
    refetchInterval: 60_000,
    retry: 1,
    gcTime: 30 * 60_000,
  });
}
