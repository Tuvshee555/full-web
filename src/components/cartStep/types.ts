export interface CartFood {
  id: string;
  foodName: string;
  price: number;
  image: string;
}

export interface CartItem {
  id: string;
  foodId: string;
  quantity: number;
  selectedSize: string | null;
  food: CartFood;
}
