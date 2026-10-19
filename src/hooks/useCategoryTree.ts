// src/hooks/useCategoryTree.ts
import { API_BASE_URL } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { sanitizeCategory } from "@/utils/catalogSanitizer";

export type CategoryNode = {
  id: string;
  categoryName: string;
  parentId: string | null;
  children?: CategoryNode[];
};

const sanitizeNode = (node: CategoryNode): CategoryNode => ({
  ...sanitizeCategory(node),
  children: Array.isArray(node.children)
    ? node.children.map(sanitizeNode)
    : undefined,
});

export function useCategoryTree() {
  return useQuery<CategoryNode[]>({
    queryKey: ["category-tree"],
    queryFn: async ({ signal }) => {
      const { data } = await axios.get(
        `${API_BASE_URL}/category/tree`, { signal, timeout: 15_000 }
      );
      if (!Array.isArray(data)) throw new Error("Invalid category response");
      return data.map(sanitizeNode);
    },
    staleTime: 60_000,
    retry: 1,
    gcTime: 60 * 60_000,
  });
}
