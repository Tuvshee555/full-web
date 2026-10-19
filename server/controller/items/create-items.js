import { prisma } from "../../prismaClient.js";

export const createItems = async (req, res) => {
  const { productId, orderId, quantity } = req.body;

  if (!productId || !orderId || !quantity) {
    return res
      .status(400)
      .json({ success: false, message: "productId, orderId, and quantity are required" });
  }

  try {
    const item = await prisma.orderItem.create({
      data: {
        productId,
        orderId,
        quantity,
      },
    });

    const allItems = await prisma.orderItem.findMany();

    res.status(200).json({ success: true, item, allItems });
  } catch (error) {
    console.error("Error creating item:", error);
    res.status(500).json({ success: false, message: "Error creating item", error: error.message });
  }
};
