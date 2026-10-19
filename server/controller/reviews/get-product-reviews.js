import { prisma } from "../../utils/prisma.js";
import { cached } from "../../utils/cache.js";

export const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;

    const reviews = await cached(`reviews:product:${productId}`, 15_000, () => prisma.review.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    }));

    const ratingCount = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;

    for (const r of reviews) {
      ratingCount[r.rating] += 1;
      sum += r.rating;
    }

    const reviewCount = reviews.length;
    const avgRating = reviewCount ? sum / reviewCount : 0;

    return res.json({
      avgRating,
      reviewCount,
      ratingCount,
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        images: r.images,
        verifiedPurchase: r.verifiedPurchase,
        createdAt: r.createdAt,
        user: {
          id: r.user.id,
          name:
            `${r.user.firstName ?? ""} ${r.user.lastName ?? ""}`.trim() || "User",
        },
      })),
    });
  } catch (err) {
    console.error("getProductReviews error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
