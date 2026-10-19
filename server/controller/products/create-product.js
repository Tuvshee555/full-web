// controller/products/create-product.js
import { prisma } from "../../prismaClient.js";
import { normalizeSizeInput } from "../../utils/sizes.js";
import { invalidateCatalog } from "../../utils/cache.js";
import { validateProductInput } from "./validate-product.js";

export const createProduct = async (req, res) => {
  const invalid = validateProductInput(req.body, true);
  if (invalid) return res.status(400).json({ message: invalid });
  try {
    const {
      productName,
      price: rawPrice,
      oldPrice: rawOldPrice,
      discount: rawDiscount,
      image,
      video,
      ingredients,
      categoryId,
      sizes,
      isFeatured = false,
      extraImages = [],
      address,
    } = req.body;

    if (!productName) {
      return res.status(400).json({ message: "productName is required" });
    }

    // parse numeric inputs safely
    const priceProvided = typeof rawPrice !== "undefined" && rawPrice !== null && rawPrice !== "";
    const oldPriceProvided =
      typeof rawOldPrice !== "undefined" && rawOldPrice !== null && rawOldPrice !== "";
    const discountProvided =
      typeof rawDiscount !== "undefined" && rawDiscount !== null && rawDiscount !== "";

    let price = priceProvided ? Number(rawPrice) : undefined;
    const oldPrice = oldPriceProvided ? Number(rawOldPrice) : null;
    let discount = discountProvided ? Number(rawDiscount) : 0;

    // sanitize discount
    if (discount < 0) discount = 0;
    if (discount > 100) discount = 100;

    // Compute price if not provided but oldPrice+discount present
    if (typeof price === "undefined" || Number.isNaN(price)) {
      if (oldPrice !== null && discount > 0) {
        price = Number((oldPrice * (1 - discount / 100)).toFixed(2));
      } else if (oldPrice !== null && discount === 0) {
        // if admin only provides oldPrice and no discount, we let price be oldPrice (no discount)
        price = Number(oldPrice);
      } else {
        return res
          .status(400)
          .json({ message: "Either price or oldPrice+discount must be provided" });
      }
    }

    // If price and oldPrice provided but discount not provided, compute discount
    if (oldPrice !== null && (!discountProvided || discount === 0)) {
      if (oldPrice > 0) {
        discount = Math.round(((oldPrice - price) / oldPrice) * 100);
        if (discount < 0) discount = 0;
        if (discount > 100) discount = 100;
      } else {
        // fallback
        discount = 0;
      }
    }

    const newProduct = await prisma.product.create({
      data: {
        productName: productName.trim(),
        price: Number(price),
        oldPrice: oldPrice !== null ? Number(oldPrice) : undefined,
        discount: discount || 0,
        image,
        video,
        ingredients,
        address: address || undefined,
        categoryId: categoryId || undefined,
        isFeatured: Boolean(isFeatured),
        extraImages: Array.isArray(extraImages) ? extraImages : [],
        sizes: {
          create: normalizeSizeInput(sizes),
        },
      },
      include: {
        category: true,
        sizes: true,
      },
    });

    invalidateCatalog();

    return res.status(201).json(newProduct);
  } catch (error) {
    if (error.code === "P2003") return res.status(400).json({ message: "Category not found" });
    console.error("Error creating product:", error);
    return res.status(500).json({ message: "Error creating product" });
  }
};
