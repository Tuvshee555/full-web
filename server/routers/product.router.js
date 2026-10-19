import { Router } from "express";
import { createProduct } from "../controller/products/create-product.js";
import { deleteProduct } from "../controller/products/delete-product.js";
import { getProduct } from "../controller/products/get-product.js";
import { updateProduct } from "../controller/products/update-product.js";
import { deleteAllProducts } from "../controller/products/delete-all-product.js";
import { getProductById } from "../controller/products/get-product-by-id.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { publicCache } from "../middleware/publicCache.js";

export const productRouter = Router();
productRouter.get("/admin/inventory", requireAdmin, getProduct);

productRouter.post("/", requireAdmin, createProduct);
productRouter.get("/", publicCache(0, 0), getProduct);
productRouter.put("/:id", requireAdmin, updateProduct);
productRouter.get("/:id", publicCache(0, 0), getProductById);


productRouter.delete("/", requireAdmin, deleteAllProducts);
productRouter.delete("/:id", requireAdmin, deleteProduct);
