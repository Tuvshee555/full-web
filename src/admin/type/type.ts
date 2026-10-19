import type { Key } from "react";

// -------------------- PRODUCT TYPES --------------------

// Represents a single product item
export type ProductType = {
  stockLevel?: "untracked" | "soldout" | "low" | "available";
  oldPrice: string;
  discount: string;
  isFeatured: boolean;
  salesCount: number;
  id: Key | null | undefined;
  productName: string;
  price: string | number;
  ingredients: string;
  categoryId: string;
  category?: string | { id: string; categoryName: string };

  // 🖼 Main image
  image?: File | string;

  // 🖼 Multiple extra images
  extraImages?: (File | string)[];

  // 🎥 Optional video
  video?: string | File | null;

  // 📏 Sizes (array of strings or objects like { label: string })
  sizes?: { label: string; stock?: number | null; stockLevel?: "untracked" | "soldout" | "low" | "available" }[] | string[];

  // Misc frontend-only helper fields
  productData?: [];
  categories?: string;
};

// Form state for the UpdateProduct dialog (prices kept as strings for input binding)
export type ProductFormState = Omit<ProductType, "price" | "oldPrice" | "discount" | "sizes"> & {
  price: string;
  oldPrice: string;
  discount: string;
  sizes: string[];
};

// Props for ProductCard component
export type ProductCardPropsType = {
  product: ProductType;
  refreshProduct: () => void;
  category?: CategoryType;
};

// Props for AddProduct modal/component
export type ProductData = {
  productName: string;
  price: string;
  ingredients: string;
  image: File | null;
  category: string;
};

// Props for ProductModel (add/edit product modal)
export type ProductModelProps = {
  category: {
    id: string;
    categoryName: string;
  };
  closeModal: () => void;
  refreshProduct: () => void;
};

// Props for ProductCategoryList component
export type ProductCategoryListPropsType = {
  category: CategoryType & { _id?: string }; // support _id from backend if exists
  productData: ProductType[];
  refreshProduct: () => void;
};

// -------------------- CATEGORY TYPES --------------------

// Represents a single category
export type CategoryType = {
  id: string;
  categoryName: string;
  productCount: number;
};

// Props for SelectCategory component
export type SelectCategoryProps = {
  handleChange: (e: { name: string; value: string }) => void;
  updatedProduct?: ProductType;
};

// -------------------- USER TYPES --------------------

// Represents a user object
export type User = {
  email: string;
  password: string;
  repassword: string;
  role?: string;
};

// Props for CreatePassword step/component
export type UserType = {
  setUser: React.Dispatch<React.SetStateAction<User>>;
  nextStep: () => void;
  stepBack: () => void;
  user: User;
};

export type SignUpEmailStepType = {
  nextStep: () => void;
  stepBack?: () => void;
  setUser: React.Dispatch<React.SetStateAction<User>>; // use User type
  user: User; // use full User type
};

export type Datas = {
  name: string;
  username: string | number | readonly string[] | undefined;
  categoryName: string;
  _id: string;
  productCount: number;
};
