import { prisma } from "../../utils/prisma.js";

// Storefront "what customers say" strip: newest real reviews (4★+) that have
// written text. Shows first name + last initial only.
export const getLatestReviews = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 6, 1), 12);

    const reviews = await prisma.review.findMany({
      where: { rating: { gte: 4 }, comment: { not: "" } },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: { select: { firstName: true, lastName: true } },
        food: { select: { id: true, foodName: true, image: true } },
      },
    });

    return res.json(
      reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        verifiedPurchase: r.verifiedPurchase,
        createdAt: r.createdAt,
        name: [r.user?.firstName, r.user?.lastName ? `${r.user.lastName[0]}.` : ""].filter(Boolean).join(" ") || null,
        product: r.food ? { id: r.food.id, name: r.food.foodName, image: r.food.image } : null,
      })),
    );
  } catch (err) {
    console.error("getLatestReviews error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
