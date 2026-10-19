/* eslint-disable @typescript-eslint/no-explicit-any */
export type OrderItem = {
  quantity: number;
  product: {
    productName: string;
    price: number;
    image: string;
  };
};

export type OrderData = {
  payment: any;
  orderNumber: any;
  createdAt: string | number | Date;
  status: string;
  paymentMethod: string;
  id?: string;
  totalPrice?: number;
  deliveryFee?: number;
  productTotal?: number;
  items?: OrderItem[];
  delivery: any;
};
