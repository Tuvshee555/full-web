/* eslint-disable @typescript-eslint/no-explicit-any */
export type ProductType = {
  oldPrice: number;
  discount: number;
  isFeatured: any;
  productId: string;
  salesCount: number;
  avgRating?: number;
  reviewCount?: number;
  createdAt: number;
  available: boolean;
  stock: number;
  id: string;
  _id?: string;
  categoryId: string;
  productName: string;
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
  refreshProduct?: () => void;
  productData?: ProductType[];
  categories?: string;
};

// ✅ Product card prop
export type ProductCardPropsType = {
  product: ProductType;
};

// ✅ Add product order prop
export type AddOrderProps = {
  product: ProductType;
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
  productCount: number;
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
  productCount: number;
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

export type CartProduct = {
  id: string;
  productName: string;
  price: number;
  image: string;
};

export type CartItem = {
  id?: string;
  productId: string;
  quantity: number;
  selectedSize: string | null;
  product: CartProduct;
};
