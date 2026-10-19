import { prisma } from "../../prismaClient.js";
import { invalidateCatalog } from "../../utils/cache.js";

export const deleteAllFoods = async (req, res) => {
  try {
    await prisma.$transaction(async (tx) => {
      const purchased = await tx.orderItem.findFirst({ select: { id: true } });
      if (purchased) throw Object.assign(new Error("Products have order history"), { code: "FOOD_HAS_ORDERS" });
      await tx.foodSize.deleteMany();
      await tx.food.deleteMany();
    });

    invalidateCatalog();

    res.json({ success: true, message: "All foods deleted successfully" });
  } catch (error) {
    if (error.code === "FOOD_HAS_ORDERS" || error.code === "P2003") {
      return res.status(409).json({ error: "Products with order history cannot be deleted. Set their stock to zero to stop selling them." });
    }
    console.error("Error deleting all foods:", error);
    res.status(500).json({ error: "Failed to delete all foods" });
  }
};
