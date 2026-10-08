/* eslint-disable @typescript-eslint/no-explicit-any */
export type FoodType = {
  oldPrice: number;
  discount: number;
  isFeatured: any;
  foodId: string;
  salesCount: number;
  createdAt: number;
  available: boolean;
  stock: number;
  id: string;
  _id?: string;
  categoryId: string;
  foodName: string;
  price: number;
  ingredients: string;
  address?: string;
  category?: string;

  // Media
  image?: string | File; // main image
  extraImages?: (string | File)[]; // multiple images
  video?: string | File; // video URL or File

  // Sizes
  sizes?: { label: string }[] | string[];

  // Optional helpers
  refreshFood?: () => void;
  foodData?: FoodType[];
  categories?: string;
};

// ✅ Food card prop
export type FoodCardPropsType = {
  food: FoodType;
};

// ✅ Add food order prop
export type AddFoodOrderProps = {
  food: FoodType;
};

// ✅ Validation type for forms
export type ValidationFunction = (
  value: string,
  nextStep: () => void,
  setError: (error: string) => void,
) => void;

// ✅ Sign-up step type
export type SignUpEmailStepType = {
  nextStep: () => void;
  stepBack?: () => void;
  setUser: React.Dispatch<React.SetStateAction<User>>;
  user: User;
};

// ✅ Input event type (used in form handlers)
export type InputEventType = {
  target: { value: string };
};

// ✅ Category data type (from backend)
export type Datas = {
  imageUrl: string;
  parentId: null;
  id: string;
  _id?: string;
  categoryName: string;
  foodCount: number;
};

// ✅ Props for category components
export type CategoriesProps = {
  category: CategoryType[];
};

// ✅ Category structure
export type CategoryType = {
  categoryName: string;
  _id?: string;
  id?: string;
  foodCount: number;
};

// ✅ User structure
export type User = {
  email: string;
  password: string;
  repassword: string;
  role?: string;
};

// ✅ Props for CreatePassword or user steps
export type UserType = {
  setUser: React.Dispatch<React.SetStateAction<User>>;
  nextStep: () => void;
  stepBack: () => void;
  user: User;
};

export type CartFood = {
  id: string;
  foodName: string;
  price: number;
  image: string;
};

export type CartItem = {
  id?: string;
  foodId: string;
  quantity: number;
  selectedSize: string | null;
  food: CartFood;
};
