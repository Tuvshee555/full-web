/* eslint-disable @typescript-eslint/no-explicit-any */

export type OrderStatus =
  | "PENDING"
  | "WAITING_PAYMENT"
  | "COD_PENDING"
  | "PAID"
  | "DELIVERING"
  | "DELIVERED"
  | "CANCELLED";

export type OrderItem = {
  id: string;
  quantity: number;
  food: {
    id: string;
    foodName: string;
    price: number;
    image: string;
  };
};

export type OrderDetails = {
  id: string;
  orderNumber: any; // ✅ backend value
  paymentMethod: any; // ✅ backend enum (QPAY, COD, BANK)
  status: OrderStatus;
  totalPrice: number;
  createdAt: string;

  delivery: any;
  items: OrderItem[];

  qpay?: any;
  deliveryFee?: any;
};
