import { prisma } from "../../prismaClient.js";
import { invalidateCatalog } from "../../utils/cache.js";

export const deleteAllProducts = async (req, res) => {
  try {
    await prisma.$transaction(async (tx) => {
      const purchased = await tx.orderItem.findFirst({ select: { id: true } });
      if (purchased) throw Object.assign(new Error("Products have order history"), { code: "PRODUCT_HAS_ORDERS" });
      await tx.productSize.deleteMany();
      await tx.product.deleteMany();
    });

    invalidateCatalog();

    res.json({ success: true, message: "All products deleted successfully" });
  } catch (error) {
    if (error.code === "PRODUCT_HAS_ORDERS" || error.code === "P2003") {
      return res.status(409).json({ error: "Products with order history cannot be deleted. Set their stock to zero to stop selling them." });
    }
    console.error("Error deleting all products:", error);
    res.status(500).json({ error: "Failed to delete all products" });
  }
};
