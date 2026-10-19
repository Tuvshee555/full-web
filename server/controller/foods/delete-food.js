import { prisma } from "../../prismaClient.js";
import { invalidateCatalog } from "../../utils/cache.js";

// 🧩 Delete single food by ID
export const deleteFood = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.$transaction(async (tx) => {
      const purchased = await tx.orderItem.findFirst({ where: { foodId: id }, select: { id: true } });
      if (purchased) throw Object.assign(new Error("Product has order history"), { code: "FOOD_HAS_ORDERS" });
      await tx.foodSize.deleteMany({ where: { foodId: id } });
      await tx.food.delete({ where: { id } });
    });

    invalidateCatalog();

    res.status(200).json({ success: true, message: "Successfully deleted food" });
  } catch (error) {
    if (error.code === "FOOD_HAS_ORDERS" || error.code === "P2003") {
      return res.status(409).json({ success: false, message: "This product has order history and cannot be deleted. Set its stock to zero to stop selling it." });
    }
    if (error.code === "P2025") {
      return res.status(404).json({ success: false, message: "Food not found" });
    }
    console.error("Error deleting food:", error);
    res.status(500).json({ success: false, message: "Error deleting food" });
  }
};
