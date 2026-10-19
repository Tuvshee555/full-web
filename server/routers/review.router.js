import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { publicCache } from "../middleware/publicCache.js";
import { getProductReviews } from "../controller/reviews/get-product-reviews.js";
import { createProductReview } from "../controller/reviews/create-product-review.js";
import { updateReview } from "../controller/reviews/update-review.js";
import { deleteReview } from "../controller/reviews/delete-review.js";
import { getLatestReviews } from "../controller/reviews/get-latest-reviews.js";

export const reviewRouter = Router();

// public
reviewRouter.get("/latest", publicCache(), getLatestReviews);
reviewRouter.get("/products/:productId", publicCache(), getProductReviews);

// protected
reviewRouter.post("/products/:productId", requireAuth, createProductReview);
reviewRouter.put("/:reviewId", requireAuth, updateReview);
reviewRouter.delete("/:reviewId", requireAuth, deleteReview);
