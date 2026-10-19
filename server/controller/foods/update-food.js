// controller/foods/update-food.js
import { prisma } from "../../prismaClient.js";
import { normalizeSizeInput } from "../../utils/sizes.js";
import { invalidateCatalog } from "../../utils/cache.js";
import { validateFoodInput } from "./validate-food.js";

export const updateFood = async (req, res) => {
  const invalid = validateFoodInput(req.body);
  if (invalid) return res.status(400).json({ error: invalid });
  const { id } = req.params;
  const {
    foodName,
    price: rawPrice,
    oldPrice: rawOldPrice,
    discount: rawDiscount,
    image,
    extraImages,
    ingredients,
    categoryId,
    address,
    video,
    sizes,
    isFeatured,
    salesCount, // optional manual override
  } = req.body;

  if (!id) return res.status(400).json({ error: "Missing food ID" });

  try {
    // Parse numbers if present
    const provided = {
      price: typeof rawPrice !== "undefined" && rawPrice !== null && rawPrice !== "" ? Number(rawPrice) : undefined,
      oldPrice: typeof rawOldPrice !== "undefined" && rawOldPrice !== null && rawOldPrice !== "" ? Number(rawOldPrice) : undefined,
      discount:
        typeof rawDiscount !== "undefined" && rawDiscount !== null && rawDiscount !== "" ? Number(rawDiscount) : undefined,
    };

    // sanitize discount bounds if provided
    if (typeof provided.discount === "number") {
      if (provided.discount < 0) provided.discount = 0;
      if (provided.discount > 100) provided.discount = 100;
    }

    let computedPrice = provided.price;
    let computedOldPrice = provided.oldPrice;
    let computedDiscount = typeof provided.discount === "number" ? provided.discount : undefined;

    // Compute missing values according to inputs
    // 1) If price missing but oldPrice + discount present -> compute price
    if (typeof computedPrice === "undefined") {
      if (typeof computedOldPrice === "number" && typeof computedDiscount === "number") {
        computedPrice = Number((computedOldPrice * (1 - computedDiscount / 100)).toFixed(2));
      } else if (typeof computedOldPrice === "number" && typeof computedDiscount === "undefined") {
        // if only oldPrice provided, treat price == oldPrice (no discount)
        computedPrice = Number(computedOldPrice);
        computedDiscount = 0;
      }
    }

    // 2) If oldPrice missing but price + discount provided -> compute oldPrice
    if (typeof computedOldPrice === "undefined") {
      if (typeof computedPrice === "number" && typeof computedDiscount === "number") {
        if (computedDiscount >= 100) {
          // avoid division by zero
          computedOldPrice = computedPrice;
        } else {
          computedOldPrice = Number((computedPrice / (1 - computedDiscount / 100)).toFixed(2));
        }
      }
    }

    // 3) If discount missing but oldPrice + price provided -> compute discount
    if (typeof computedDiscount === "undefined") {
      if (typeof computedOldPrice === "number" && typeof computedPrice === "number" && computedOldPrice > 0) {
        computedDiscount = Math.round(((computedOldPrice - computedPrice) / computedOldPrice) * 100);
        if (computedDiscount < 0) computedDiscount = 0;
        if (computedDiscount > 100) computedDiscount = 100;
      }
    }

    // Build update payload, only including fields that were explicitly provided or computed above.
    const updateData = {
      foodName: typeof foodName === "string" ? foodName.trim() : undefined,
      price: typeof computedPrice === "number" ? Number(computedPrice) : undefined,
      oldPrice: rawOldPrice === null ? null : typeof computedOldPrice === "number" ? Number(computedOldPrice) : undefined,
      discount: typeof computedDiscount === "number" ? computedDiscount : undefined,
      image: typeof image === "string" ? image : undefined,
      extraImages: Array.isArray(extraImages) ? extraImages : undefined,
      ingredients: typeof ingredients === "string" ? ingredients : undefined,
      address: typeof address === "string" ? address : undefined,
      categoryId: categoryId === null || categoryId === "" ? null : typeof categoryId === "string" ? categoryId : undefined,
      video: typeof video === "string" ? video : undefined,
      isFeatured: typeof isFeatured === "boolean" ? isFeatured : undefined,
      salesCount: salesCount != null && salesCount !== "" ? Number(salesCount) : undefined,
    };

    const updatedFood = await prisma.$transaction(async (tx) => {
      // Legacy label-only edits preserve the current inventory. Explicit null
      // switches an option back to untracked stock.
      if (Array.isArray(sizes)) {
        const incoming = normalizeSizeInput(sizes);

        const existingSizes = await tx.foodSize.findMany({
          where: { foodId: id },
          select: { label: true, stock: true },
        });
        const priorStock = new Map(existingSizes.map((s) => [s.label, s.stock]));
        for (const size of sizes) {
          if (!size || typeof size !== "object" || !Object.hasOwn(size, "expectedStock")) continue;
          const label = size.label.trim();
          const expected = size.expectedStock == null ? null : Number(size.expectedStock);
          if (!priorStock.has(label) || priorStock.get(label) !== expected) {
            throw Object.assign(new Error("Inventory changed since this product was opened. Refresh it before adjusting stock."), { code: "STALE_INVENTORY" });
          }
        }
        const explicitStock = new Set(sizes
          .filter((s) => s && typeof s === "object" && Object.hasOwn(s, "stock"))
          .map((s) => String(s.label ?? "").trim()));

        const merged = incoming.map((s) => ({
          label: s.label,
          stock: explicitStock.has(s.label)
            ? s.stock
            : priorStock.has(s.label)
            ? priorStock.get(s.label)
            : null,
        }));

        const incomingByLabel = new Map(merged.map((size) => [size.label, size]));
        const existingByLabel = new Map(existingSizes.map((size) => [size.label, size]));
        const structuralChanges = new Set([
          ...existingSizes.filter((size) => !incomingByLabel.has(size.label) ||
            (size.stock == null) !== (incomingByLabel.get(size.label).stock == null)).map((size) => size.label),
          ...merged.filter((size) => !existingByLabel.has(size.label)).map((size) => size.label),
        ]);
        if (structuralChanges.size) {
          const activeOrder = await tx.orderItem.findFirst({
            where: {
              foodId: id,
              size: { in: [...structuralChanges] },
              order: { status: { in: ["PENDING", "WAITING_PAYMENT", "COD_PENDING", "PAID", "DELIVERING"] } },
            },
            select: { id: true },
          });
          if (activeOrder) throw Object.assign(new Error("Finish or cancel active orders before renaming, removing, or changing stock tracking for their options. Stock quantities can still be adjusted."), { code: "ACTIVE_VARIANT_ORDERS" });
        }

        updateData.sizes = {
          deleteMany: {},
          create: merged,
        };
      }

      return tx.food.update({
        where: { id },
        data: updateData,
        include: { category: true, sizes: true },
      });
    }, { isolationLevel: "Serializable" });

    invalidateCatalog();

    return res.json(updatedFood);
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ error: "Product not found" });
    if (error.code === "P2034") return res.status(409).json({ error: "Inventory changed while saving. Refresh the product and try again." });
    if (error.code === "P2003") return res.status(400).json({ error: "Category not found" });
    if (error.code === "ACTIVE_VARIANT_ORDERS") return res.status(409).json({ error: error.message });
    if (error.code === "STALE_INVENTORY") return res.status(409).json({ error: error.message });
    console.error("Error updating food:", error);
    return res.status(500).json({
      error: "Failed to update food",
    });
  }
};
