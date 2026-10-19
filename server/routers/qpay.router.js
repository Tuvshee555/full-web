import express from "express";
import { checkPayment, createInvoice, webhook } from "../controller/qpay/qpay.controller.js";
import { requireAuth } from "../middleware/requireAuth.js";
import rateLimit from "express-rate-limit";

export const qpayRouter = express.Router();
const createLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user.id,
  standardHeaders: true,
  legacyHeaders: false,
});
const checkLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, keyGenerator: (req) => req.user.id, standardHeaders: true, legacyHeaders: false });

qpayRouter.post("/create", requireAuth, createLimiter, createInvoice);
qpayRouter.post("/check", requireAuth, checkLimiter, checkPayment);
qpayRouter.post("/webhook", webhook);
