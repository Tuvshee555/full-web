// controller/categories/update-categories.js
import { prisma } from "../../prismaClient.js";
import { invalidateCatalog } from "../../utils/cache.js";

export const updateCategories = async (req, res) => {
  const { id, categoryName, parentId } = req.body;

  if (typeof id !== "string" || !id) {
    return res
      .status(400)
      .json({ success: false, message: "Category ID is required" });
  }
  if (categoryName !== undefined && (typeof categoryName !== "string" || !categoryName.trim() || categoryName.trim().length > 200)) {
    return res.status(400).json({ success: false, message: "Category name must be 1-200 characters" });
  }
  if (parentId != null && typeof parentId !== "string") return res.status(400).json({ success: false, message: "Invalid parent category" });

  const data = {};

  if (typeof categoryName === "string" && categoryName.trim().length > 0) {
    data.categoryName = categoryName.trim();
  }

  // if parentId is provided (can be null), update it
  if (parentId !== undefined) {
    data.parentId = parentId || null;
  }

  try {
    // optional: prevent self-parent
    if (parentId && parentId === id) {
      return res
        .status(400)
        .json({ success: false, message: "Category cannot be its own parent" });
    }

    const updatedCategory = await prisma.$transaction(async (tx) => {
      if (parentId) {
        const categories = await tx.category.findMany({ select: { id: true, parentId: true } });
        const parents = new Map(categories.map((category) => [category.id, category.parentId]));
        if (!parents.has(parentId)) throw Object.assign(new Error("Parent category not found"), { status: 400 });
        const visited = new Set();
        let ancestor = parentId;
        while (ancestor) {
          if (ancestor === id || visited.has(ancestor)) {
            throw Object.assign(new Error("A category cannot be placed inside its own descendants"), { status: 400 });
          }
          visited.add(ancestor);
          ancestor = parents.get(ancestor);
        }
      }
      return tx.category.update({ where: { id }, data });
    }, { isolationLevel: "Serializable" });

    invalidateCatalog();

    res.status(200).json({ success: true, category: updatedCategory });
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ success: false, message: error.message });
    if (error.code === "P2025") return res.status(404).json({ success: false, message: "Category not found" });
    if (error.code === "P2034") return res.status(409).json({ success: false, message: "Categories changed during this edit. Please retry." });
    console.error("Error while updating category:", error);
    res.status(500).json({
      success: false,
      message: "Error while updating category",
    });
  }
};
