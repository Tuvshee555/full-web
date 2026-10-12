import { prisma } from "../../prismaClient.js";
import { getSettings } from "../../chatbot/settings.js";
import { publicInventory } from "../../utils/stockLevel.js";

export const getFoodById = async (req, res) => {
  const { id } = req.params;
  try {
    const food = await prisma.food.findUnique({
      where: { id },
      include: { category: true, sizes: true },
    });
    if (!food) return res.status(404).json({ message: "Food not found" });
    res.json(publicInventory(food, await getSettings()));
  } catch (error) {
    console.error("Error fetching food by ID:", error);
    res.status(500).json({ message: "Server error" });
  }
};
