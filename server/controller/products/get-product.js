import { prisma } from "../../prismaClient.js";
import { cached } from "../../utils/cache.js";
import { getSettings } from "../../../src/chatbot/settings.mjs";
import { publicInventory } from "../../utils/stockLevel.js";

export const getProduct = async (req, res) => {
  try {
    const [products, settings] = await Promise.all([cached("products:all", 20_000, () =>
      prisma.product.findMany({
        include: {
          category: true,
          sizes: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      })
    ), getSettings()]);
    if (req.user?.role === "ADMIN") res.set("Cache-Control", "private, no-store");
    return res.status(200).json(products.map((product) => publicInventory(product, settings, req.user?.role === "ADMIN")));
  } catch (err) {
    console.error("Error fetching products:", err);
    return res
      .status(500)
      .json({ message: "Error while getting products" });
  }
};
