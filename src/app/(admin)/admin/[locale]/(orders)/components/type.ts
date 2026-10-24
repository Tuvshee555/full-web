/* eslint-disable @typescript-eslint/no-explicit-any */
export type OrderStatus =
  | "PENDING"
  | "WAITING_PAYMENT"
  | "COD_PENDING"
  | "PAID"
  | "DELIVERING"
  | "DELIVERED"
  | "CANCELLED";

export type ProductItem = {
  id?: string;
  quantity: number;
  product?: {
    id?: string;
    productName?: string;
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
  deliveryFee?: number;
  createdAt?: string;
  updatedAt?: string;
  status?: OrderStatus;
  paymentMethod?: string;
  paymentStatus?: "PAID" | "UNPAID" | "REVIEW" | "REFUNDED";
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
  orderItems?: Array<{
    id?: string;
    quantity: number;
    size?: string | null;
    unitPrice?: number | null;
    product?: {
      id?: string;
      productName?: string;
      price?: number;
      image?: string | null;
      categoryId?: string | null;
    } | null;
  }>;
  items?: ProductItem[];
};

// Must match ALLOWED_TRANSITIONS in server/controller/orders/update-orders.js
export const STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["WAITING_PAYMENT", "COD_PENDING", "CANCELLED"],
  WAITING_PAYMENT: ["PAID", "CANCELLED"],
  COD_PENDING: ["DELIVERING", "CANCELLED"],
  PAID: ["DELIVERING"],
  DELIVERING: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

/** Orders that still need the admin (confirm a payment, ship, …): drives the sidebar badge. */
export const OPEN_STATUSES: OrderStatus[] = ["PENDING", "WAITING_PAYMENT", "COD_PENDING", "PAID"];

/** Filter tabs, grouped by what the admin has to do next. */
export const ORDER_TABS: { id: string; statuses: OrderStatus[] }[] = [
  { id: "all", statuses: [] },
  { id: "awaiting_payment", statuses: ["PENDING", "WAITING_PAYMENT"] },
  { id: "to_ship", statuses: ["PAID", "COD_PENDING"] },
  { id: "delivering", statuses: ["DELIVERING"] },
  { id: "delivered", statuses: ["DELIVERED"] },
  { id: "cancelled", statuses: ["CANCELLED"] },
];

/** The one obvious next step for an order (cancel is offered separately). */
export function primaryNext(status: OrderStatus, paymentMethod?: string): OrderStatus | null {
  switch (status) {
    case "PENDING":
      return paymentMethod === "COD" ? "COD_PENDING" : "WAITING_PAYMENT";
    case "WAITING_PAYMENT":
      return paymentMethod === "BANK" ? "PAID" : null;
    case "COD_PENDING":
    case "PAID":
      return "DELIVERING";
    case "DELIVERING":
      return "DELIVERED";
    default:
      return null;
  }
}

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
