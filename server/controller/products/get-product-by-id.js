import { prisma } from "../../prismaClient.js";
import { getSettings } from "../../../src/chatbot/settings.mjs";
import { publicInventory } from "../../utils/stockLevel.js";

export const getProductById = async (req, res) => {
  const { id } = req.params;
  try {
    const [product, settings] = await Promise.all([prisma.product.findUnique({
      where: { id },
      include: { category: true, sizes: true },
    }), getSettings()]);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(publicInventory(product, settings));
  } catch (error) {
    console.error("Error fetching product by ID:", error);
    res.status(500).json({ message: "Server error" });
  }
};
