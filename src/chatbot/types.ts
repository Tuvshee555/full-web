export type Locale = "mn" | "en";
export type ProductVariant = { id: string; label: string; price?: number | null; stock: number | null };
export type CatalogProduct = {
  id: string; foodName: string; price: number; oldPrice?: number | null; discount?: number | null;
  ingredients?: string | null; sizes: ProductVariant[];
  category?: { categoryName?: string; name?: string } | null;
};
export type ProductContent = {
  tagline?: string; fullIngredients?: string; howTo?: string[];
  keyIngredients?: Array<{ name: string; text: string }>;
  faq?: Array<{ q: string; a: string }>;
};
export type BotSettings = {
  enabled: boolean; metaOutbound?: boolean; greetingMn: string; greetingEn: string;
  handoffMn: string; handoffEn: string; lowStockThreshold: number; showExactStock: boolean;
  extraKnowledgeMn: string; extraKnowledgeEn: string;
};
export type CatalogueContext = {
  products: CatalogProduct[]; settings: BotSettings; locale: Locale;
  content: Record<string, ProductContent>;
  store: { contact: { phone?: string; email?: string }; bank: { name: string; holder: string; account: string } };
  brand: { faq: Array<{ q: string; a: string }>; about: string[] };
  deliveryFee: number; site: string;
};
export type ChatMessage = { role: "user" | "assistant"; text: string };
export type ConversationState = Record<string, unknown>;
