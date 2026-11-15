export type Locale = "mn" | "en";
export type ProductVariant = { id: string; label: string; price?: number | null; stock: number | null };
export type ProductFaqItem = { q: string; a: string };
export type CatalogProduct = {
  id: string; productName: string; price: number; oldPrice?: number | null; discount?: number | null;
  ingredients?: string | null; sizes: ProductVariant[];
  category?: { categoryName?: string; name?: string } | null;
  /** Product facts the owner publishes in the admin (also shown on the product page). */
  volume?: string | null; howToUse?: string | null; ingredientList?: string | null; safetyNotes?: string | null;
  storage?: string | null; usageFrequency?: string | null;
  faq?: ProductFaqItem[] | null;
  /** Facts the owner checked against the real product ({ fact: ISO date }); unverified facts are never quoted. */
  verifiedFacts?: Record<string, string> | null;
};
export type ProductFactKey = "description" | "ingredients" | "volume" | "usage" | "frequency" | "storage" | "safety" | "claims" | "photos" | "price" | "stock";
export type ProductContent = {
  tagline?: string; fullIngredients?: string; howTo?: string[]; frequency?: string; storage?: string; safety?: string; description?: string;
  keyIngredients?: Array<{ name: string; text: string }>;
  faq?: Array<{ q: string; a: string }>;
};
export type BotSettings = {
  enabled: boolean; metaOutbound?: boolean; greetingMn: string; greetingEn: string;
  handoffMn: string; handoffEn: string; lowStockThreshold: number; showExactStock: boolean;
  extraKnowledgeMn: string; extraKnowledgeEn: string;
  /** Chat orders (bank transfer) after an explicit confirmation; default on. */
  chatOrdersEnabled?: boolean;
  handoverAutoResumeHours?: number;
  aiModel?: string;
  aiDailyBudgetUsd?: number;
  /** Chat order reservation policy (defaults: 60 minutes, 1 unpaid order per phone, 5 units per option). */
  chatReservationMinutes?: number;
  chatMaxActiveReservationsPerPhone?: number;
  chatMaxQuantityPerItem?: number;
};
export type ShopFaqItem = { q: string; a: string };
export type CatalogueContext = {
  products: CatalogProduct[]; settings: BotSettings; locale: Locale;
  content: Record<string, ProductContent>;
  store: { name?: string; contact: { phone?: string; email?: string }; bank: { name: string; holder: string; account: string } };
  /** Policies and FAQ in the customer's language; the shop FAQ the owner edits is merged in. */
  brand: { faq: Array<{ q: string; a: string }>; about: string[] };
  policies?: { delivery: string; returns: string; safety: string };
  deliveryFee: number; site: string;
};
export type ChatMessage = { role: "user" | "assistant"; text: string };
export type ConversationState = Record<string, unknown>;
/** Why the assistant asked for a person; stored on the lead and the conversation for the inbox. */
export type HandoffReason = "customer_request" | "complaint" | "payment_claim" | "medical" | "unanswered" | "order_problem" | "ai_error" | "bulk_order";

/** A chat order the customer is building (bank transfer). Cleared after creation, cancellation or 30 minutes. */
export type OrderDraft = {
  step: "pick_product" | "pick_variant" | "offer" | "contact" | "address" | "confirm";
  productId?: string;
  variantLabel?: string | null;
  quantity: number;
  name?: string;
  phone?: string;
  zone?: "UB" | "RURAL";
  city?: string;
  district?: string;
  khoroo?: string;
  address?: string;
  updatedAt: number;
};
export type ChatOrderRequest = {
  conversationId: string;
  locale: Locale;
  items: Array<{ productId: string; productName: string; size: string | null; quantity: number; unitPrice: number }>;
  name: string;
  phone: string;
  zone: "UB" | "RURAL";
  city: string;
  district: string;
  khoroo: string;
  address: string;
  idempotencyKey: string;
};
export type ChatOrderResult = { orderNumber: string; totalPrice: number; deliveryFee: number; status: string; paymentMethod: string; expiresAt?: string; reservationMinutes?: number };
export type PlaceChatOrder = (request: ChatOrderRequest) => Promise<ChatOrderResult>;
