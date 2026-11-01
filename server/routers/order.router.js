import { Router } from "express";
import { createOrder } from "../controller/orders/create-orders.js";
import { deleteOrder } from "../controller/orders/delete-orders.js";
import { getOrdersByUser } from "../controller/orders/get-orders-by-user.js";
import { getOrderById } from "../controller/orders/get-order-by-id.js";
import { updatedOrder } from "../controller/orders/update-orders.js";
import { notifyBankTransfer } from "../controller/orders/notify-bank-transfer.js";
import { getAllOrder } from "../controller/orders/all-order.js";
import { getCustomers } from "../controller/orders/customers.js";
import { lookupOrder } from "../controller/orders/lookup-order.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import rateLimit from "express-rate-limit";

export const orderRouter = Router();

// Order number + phone: a few tries per visitor, so the form cannot be used to guess orders.
const lookupLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { code: "RATE_LIMITED", message: "Too many attempts. Please try again later." } });

orderRouter.post("/", requireAuth, createOrder);
orderRouter.delete("/", requireAuth, deleteOrder);
orderRouter.post("/lookup", lookupLimiter, lookupOrder);

orderRouter.get("/user/:userId", requireAuth, getOrdersByUser);
// Before "/:id", which would otherwise take "customers" for an order id.
orderRouter.get("/customers", requireAdmin, getCustomers);
orderRouter.get("/:id", requireAuth, getOrderById);

orderRouter.post("/:id/bank-transfer-notice", requireAuth, notifyBankTransfer);
orderRouter.patch("/:id", requireAuth, updatedOrder);
orderRouter.get("/", requireAdmin, getAllOrder);
