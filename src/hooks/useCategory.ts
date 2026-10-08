// src/hooks/useCategory.ts
import { API_BASE_URL } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Datas } from "@/type/type";
import { sanitizeCategoryList } from "@/utils/catalogSanitizer";

export function useCategory() {
  return useQuery<Datas[]>({
    queryKey: ["category"],
    queryFn: async () => {
      const { data } = await axios.get(
        `${API_BASE_URL}/category`
      );
      return sanitizeCategoryList(Array.isArray(data) ? data : []);
    },
    staleTime: 10 * 60_000, // explained below
    gcTime: 30 * 60_000,
  });
}
