import { Router } from "express";
import { createOrder } from "../controller/orders/create-orders.js";
import { deleteOrder } from "../controller/orders/delete-orders.js";
import { getOrdersByUser } from "../controller/orders/get-orders-by-user.js";
import { getOrderById } from "../controller/orders/get-order-by-id.js";
import { updatedOrder } from "../controller/orders/update-orders.js";
import { notifyBankTransfer } from "../controller/orders/notify-bank-transfer.js";
import { getAllOrder } from "../controller/orders/all-order.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

export const orderRouter = Router();

orderRouter.post("/", requireAuth, createOrder);
orderRouter.delete("/", requireAuth, deleteOrder);

orderRouter.get("/user/:userId", requireAuth, getOrdersByUser);
orderRouter.get("/:id", requireAuth, getOrderById);

orderRouter.post("/:id/bank-transfer-notice", requireAuth, notifyBankTransfer);
orderRouter.patch("/:id", requireAuth, updatedOrder);
orderRouter.get("/", requireAdmin, getAllOrder);
