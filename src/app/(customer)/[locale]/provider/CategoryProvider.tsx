/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Datas } from "@/type/type";

type CategoryContextType = {
  category: Datas[];
  loading: boolean;
  refreshCategories: () => void;
};

const CategoryContext = createContext<CategoryContextType>(
  {} as CategoryContextType
);

export const CategoryProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [category, setCategory] = useState<Datas[]>([]);
  const [loading, setLoading] = useState(true);

  const getData = async () => {
    try {
      const response = await api.get(`/category`);
      setCategory(response.data);
    } catch (error) {
      // console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  return (
    <CategoryContext.Provider
      value={{ category, loading, refreshCategories: getData }}
    >
      {children}
    </CategoryContext.Provider>
  );
};

export const useCategory = () => {
  const context = useContext(CategoryContext);
  if (!context) {
    throw new Error("useCategory must be used within a CategoryProvider");
  }
  return context;
};
