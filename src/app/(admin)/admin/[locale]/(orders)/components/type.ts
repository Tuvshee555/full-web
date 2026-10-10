/* eslint-disable @typescript-eslint/no-explicit-any */
export type OrderStatus =
  | "PENDING"
  | "WAITING_PAYMENT"
  | "COD_PENDING"
  | "PAID"
  | "DELIVERING"
  | "DELIVERED"
  | "CANCELLED";

export type FoodItem = {
  id?: string;
  quantity: number;
  food?: {
    id?: string;
    foodName?: string;
    price?: number;
    image?: string | null;
    categoryId?: string | null;
  } | null;
};

export type RawOrder = {
  __expanded: any;
  id: string;
  orderNumber?: string;
  totalPrice?: number;
  createdAt?: string;
  updatedAt?: string;
  status?: OrderStatus;
  paymentMethod?: string;
  user?: { id?: string; email?: string; address?: string | null } | null;
  delivery?: {
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    city?: string | null;
    district?: string | null;
    khoroo?: string | null;
    address?: string | null;
    notes?: string | null;
  };
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  city?: string | null;
  district?: string | null;
  khoroo?: string | null;
  address?: string | null;
  notes?: string | null;
  foodOrderItems?: Array<{
    id?: string;
    quantity: number;
    food?: {
      id?: string;
      foodName?: string;
      price?: number;
      image?: string | null;
      categoryId?: string | null;
    } | null;
  }>;
  items?: FoodItem[];
};

export const STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["WAITING_PAYMENT", "PAID", "CANCELLED"],
  WAITING_PAYMENT: ["PAID", "CANCELLED"],
  COD_PENDING: ["DELIVERING", "CANCELLED"],
  PAID: ["DELIVERING"],
  DELIVERING: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export const PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='240'><rect width='100%' height='100%' fill='#f3f4f6'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#9ca3af' font-size='16'>No image</text></svg>`
  );

export const STATUS_BADGE: Record<OrderStatus, string> = {
  PENDING: "bg-sand text-taupe border-transparent",
  WAITING_PAYMENT: "bg-terracotta/10 text-terracotta border-transparent",
  COD_PENDING: "bg-sand text-taupe border-transparent",
  PAID: "bg-ink text-paper border-transparent",
  DELIVERING: "bg-ink/10 text-ink border-transparent",
  DELIVERED: "bg-[#5b6b4b]/15 text-[#44523a] border-transparent",
  CANCELLED: "bg-ink/5 text-ink/45 border-transparent",
};