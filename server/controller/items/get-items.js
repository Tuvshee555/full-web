import { prisma } from "../../prismaClient.js";

export const getItems = async (req, res) => {
  try {
    const items = await prisma.orderItem.findMany({
      include: {
        product: true,        // include related product details
        order: true,       // include related order details
      },
    });

    res.status(200).json(items);
  } catch (error) {
    console.error("Error while getting items:", error);
    res.status(500).json({ message: `Error while getting items: ${error.message}` });
  }
};
