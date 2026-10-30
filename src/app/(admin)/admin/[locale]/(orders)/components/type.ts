/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Tone } from "@admin/components/ui/status";

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
  size?: string | null;
  unitPrice?: number | null;
  product?: {
    id?: string;
    productName?: string;
    price?: number;
    image?: string | null;
    categoryId?: string | null;
  } | null;
};

export type RawOrder = {
  __expanded?: any;
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
  orderItems?: ProductItem[];
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

/** Orders that still need the admin (confirm a payment, ship, …). */
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

type OrderLike = Pick<RawOrder, "status" | "paymentMethod" | "paymentStatus">;

/** Status colour from the owner's point of view: does this order need me right now? */
export function orderTone(order: OrderLike): Tone {
  switch (order.status ?? "PENDING") {
    case "PENDING":
    case "COD_PENDING":
    case "PAID":
      return "attention";
    case "WAITING_PAYMENT":
      // Only a bank transfer needs the owner to check the account; QPay confirms itself.
      return order.paymentMethod === "BANK" ? "attention" : "waiting";
    case "DELIVERING":
      return "progress";
    case "DELIVERED":
      return "success";
    default:
      return "neutral";
  }
}

/** Key under "orders.next" for the plain sentence that says what happens next. */
export function nextStepKey(order: OrderLike): string {
  const status = order.status ?? "PENDING";
  if (status === "CANCELLED") return order.paymentStatus === "REVIEW" ? "REVIEW" : "CANCELLED";
  if (status === "WAITING_PAYMENT") {
    return order.paymentMethod === "BANK" ? "WAITING_BANK" : order.paymentMethod === "QPAY" ? "WAITING_QPAY" : "WAITING_OTHER";
  }
  if (status === "DELIVERING" && order.paymentMethod === "COD") return "DELIVERING_COD";
  return status;
}

/** Payment label (key under "payment_state") and its colour. */
export function paymentDisplay(order: OrderLike): { tone: Tone; key: string } {
  switch (order.paymentStatus) {
    case "PAID":
      return { tone: "success", key: "PAID" };
    case "REVIEW":
      return { tone: "danger", key: "REVIEW" };
    case "REFUNDED":
      return { tone: "neutral", key: "REFUNDED" };
    case "UNPAID":
      if (order.status === "CANCELLED") return { tone: "neutral", key: "UNPAID" };
      return { tone: "waiting", key: order.paymentMethod === "COD" ? "COD" : "UNPAID" };
    default:
      return { tone: "neutral", key: "UNKNOWN" };
  }
}

export type StepState = "done" | "current" | "todo";

/** Placed → paid (or confirmed, for cash) → out for delivery → delivered. */
export function orderSteps(order: OrderLike): { key: string; state: StepState }[] {
  const keys = ["placed", order.paymentMethod === "COD" ? "confirmed" : "paid", "shipped", "delivered"];
  const reached: Partial<Record<OrderStatus, number>> = { PENDING: 1, WAITING_PAYMENT: 1, COD_PENDING: 2, PAID: 2, DELIVERING: 3, DELIVERED: 4 };
  const done = reached[order.status ?? "PENDING"] ?? 1;
  return keys.map((key, index) => ({ key, state: index < done ? "done" : index === done ? "current" : "todo" }));
}

export const orderNumber = (order: Pick<RawOrder, "id" | "orderNumber">) => order.orderNumber ?? order.id.slice(0, 8);

export const PLACEHOLDER = "/product-image-coming-soon.svg";
