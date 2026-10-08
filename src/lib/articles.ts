import { API_BASE_URL } from "@/lib/api";
export type Article = {
  id: string;
  title: string;
  excerpt?: string;
  createdAt?: string;
  slug?: string;
};

const BANNED_MN_TITLES = new Set([
  "Чанартай нойр авахад ор дэрний хэрэгслийн нөлөө",
  "Цэвэр даавуу яагаад чухал вэ?",
  "Ор дэрээ хэрхэн зөв арчлах вэ?",
]);

const toArray = (data: unknown): any[] => {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const maybeObj = data as Record<string, unknown>;
    if (Array.isArray(maybeObj.articles)) return maybeObj.articles as any[];
    if (Array.isArray(maybeObj.posts)) return maybeObj.posts as any[];
    if (Array.isArray(maybeObj.data)) return maybeObj.data as any[];
    if (Array.isArray(maybeObj.results)) return maybeObj.results as any[];
  }
  return [];
};

const mapArticle = (item: any): Article | null => {
  const title = String(item?.title ?? item?.name ?? "").trim();
  if (!title) return null;
  if (BANNED_MN_TITLES.has(title)) return null;

  return {
    id: String(item?.id ?? item?._id ?? item?.slug ?? title),
    title,
    excerpt:
      typeof item?.excerpt === "string"
        ? item.excerpt
        : typeof item?.description === "string"
        ? item.description
        : "",
    createdAt:
      typeof item?.createdAt === "string"
        ? item.createdAt
        : typeof item?.date === "string"
        ? item.date
        : undefined,
    slug: typeof item?.slug === "string" ? item.slug : undefined,
  };
};

export async function fetchArticles(): Promise<Article[]> {
  const base = API_BASE_URL;
  if (!base) return [];

  const endpoints = ["/blog", "/blogs", "/article", "/articles", "/post", "/posts"];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(`${base}${endpoint}`, { cache: "no-store" });
      if (!res.ok) continue;
      const data = await res.json();
      const mapped = toArray(data).map(mapArticle).filter(Boolean) as Article[];
      return mapped;
    } catch {
      // try next endpoint
    }
  }

  return [];
}
