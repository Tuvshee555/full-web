import { prisma } from "../../prismaClient.js";
import { invalidateCatalog } from "../../utils/cache.js";

// 🧩 Delete single product by ID
export const deleteProduct = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.$transaction(async (tx) => {
      const purchased = await tx.orderItem.findFirst({ where: { productId: id }, select: { id: true } });
      if (purchased) throw Object.assign(new Error("Product has order history"), { code: "PRODUCT_HAS_ORDERS" });
      await tx.productSize.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });
    });

    invalidateCatalog();

    res.status(200).json({ success: true, message: "Successfully deleted product" });
  } catch (error) {
    if (error.code === "PRODUCT_HAS_ORDERS" || error.code === "P2003") {
      return res.status(409).json({ success: false, message: "This product has order history and cannot be deleted. Set its stock to zero to stop selling it." });
    }
    if (error.code === "P2025") {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    console.error("Error deleting product:", error);
    res.status(500).json({ success: false, message: "Error deleting product" });
  }
};
