import { prisma } from "../../prismaClient.js";
import { cached } from "../../utils/cache.js";
import { getSettings } from "../../chatbot/settings.js";
import { publicInventory } from "../../utils/stockLevel.js";

export const getFood = async (req, res) => {
  try {
    const foods = await cached("foods:all", 20_000, () =>
      prisma.food.findMany({
        include: {
          category: true,
          sizes: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      })
    );

    const settings = await getSettings();
    return res.status(200).json(foods.map((food) => publicInventory(food, settings, req.user?.role === "ADMIN")));
  } catch (err) {
    console.error("Error fetching foods:", err);
    return res
      .status(500)
      .json({ message: "Error while getting foods" });
  }
};
