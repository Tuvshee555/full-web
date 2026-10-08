import { createContext, ReactNode, useContext } from "react";
import { Datas } from "@admin/type/type";

type CategoryProviderType = {
  category: Datas; // You need to pass a category value somehow, it could be from props or external state.
  setCategory: React.Dispatch<React.SetStateAction<Datas>>; // You can set category directly if needed.
  refetchCategory: () => void;
  postData: () => void;
};

const CategoriesContext = createContext<CategoryProviderType | null>(null);

export const CategoriesProvider = ({
  children,
  category,
  setCategory,
  refetchCategory,
  postData,
}: {
  children: ReactNode;
  category: Datas;
  setCategory: React.Dispatch<React.SetStateAction<Datas>>;
  refetchCategory: () => void;
  postData: () => void;
}) => {
  return (
    <CategoriesContext.Provider
      value={{ category, setCategory, refetchCategory, postData }}
    >
      {children}
    </CategoriesContext.Provider>
  );
};

export const useCategory = () => {
  const context = useContext(CategoriesContext);
  if (!context) {
    throw new Error("useCategory must be used within a CategoriesProvider");
  }
  return context;
};
