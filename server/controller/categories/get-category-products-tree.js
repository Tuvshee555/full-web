import { prisma } from "../../prismaClient.js";
import { cached } from "../../utils/cache.js";
import { getSettings } from "../../../src/chatbot/settings.mjs";
import { publicInventory } from "../../utils/stockLevel.js";

/**
 * GET /category/:id/products-tree
 * Returns:
 * {
 *   success: true,
 *   category: { id, categoryName },
 *   products: Product[]
 * }
 */
export const getCategoryProductsTree = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Category id is required",
    });
  }

  try {
    const [payload, settings] = await Promise.all([cached(`categories:productsTree:${id}`, 20_000, async () => {
      const categories = await cached("categories:ancestry", 30_000, () => prisma.category.findMany({
        select: {
          id: true,
          parentId: true,
          categoryName: true,
        },
      }));

      const target = categories.find((c) => c.id === id);
      if (!target) return { notFound: true };

      const allIds = new Set([target.id]);
      const queue = [target.id];
      const childrenByParent = new Map();
      for (const category of categories) {
        const children = childrenByParent.get(category.parentId) ?? [];
        children.push(category.id);
        childrenByParent.set(category.parentId, children);
      }
      for (let index = 0; index < queue.length; index += 1) {
        for (const childId of childrenByParent.get(queue[index]) ?? []) {
          if (!allIds.has(childId)) {
            allIds.add(childId);
            queue.push(childId);
          }
        }
      }

      const products = await prisma.product.findMany({
        include: { sizes: true },
        where: {
          categoryId: {
            in: Array.from(allIds),
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return {
        success: true,
        category: {
          id: target.id,
          categoryName: target.categoryName,
        },
        products,
      };
    }), getSettings()]);

    if (payload.notFound) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({ ...payload, products: payload.products.map((product) => publicInventory(product, settings)) });
  } catch (error) {
    console.error("Error in getCategoryProductsTree:", error);
    return res.status(500).json({
      success: false,
      message: "Error while fetching category products",
    });
  }
};
