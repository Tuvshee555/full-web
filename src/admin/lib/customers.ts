import { api } from "./api";

/** Someone who ordered, recognised by the delivery phone number (GET /order/customers). */
export type Customer = {
  phone: string;
  firstName: string | null;
  lastName: string | null;
  city: string | null;
  district: string | null;
  email: string | null;
  orders: number;
  paidOrders: number;
  spent: number;
  firstOrderAt: string;
  lastOrderAt: string;
};

/** "99112233" -> "9911 2233": easier to read out and dial. */
export const formatPhone = (phone: string) => phone.replace(/^(\d{4})(\d{4})$/, "$1 $2");

export const customerLabel = (c: Pick<Customer, "firstName" | "lastName">, fallback: string) =>
  [c.lastName, c.firstName].filter(Boolean).join(" ") || fallback;

export const phoneDigits = (phone?: string | null) => String(phone ?? "").replace(/\D/g, "");

/** One customer's totals, for the order drawer and links that name a phone number. */
export async function loadCustomer(phone: string, signal?: AbortSignal): Promise<Customer | null> {
  const { data } = await api.get("/order/customers", { params: { phone }, signal });
  return Array.isArray(data?.customers) && data.customers[0] ? data.customers[0] : null;
}
