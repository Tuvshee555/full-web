import axios from "axios";
import crypto from "node:crypto";
import { prisma } from "../../prismaClient.js";
import { sendTelegramMessage, formatOrderStatusMessage } from "../../utils/telegram.js";
import { notifyCustomer } from "../../utils/orderNotify.js";
import { confirmPaidOrder, PAYMENT_WINDOW_MS } from "../../utils/orderPaid.js";
import { apiUrl } from "../../utils/siteUrl.js";
import { background } from "../../utils/background.js";

const QPAY_BASE_URL = process.env.QPAY_BASE_URL;
const REQUEST_TIMEOUT_MS = 8000;
const AMOUNT_EPSILON = 0.01;
let cachedToken = null;
let tokenExpiry = 0;
let pendingToken = null;

const toMoney = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
};
const canAccessOrder = (req, order) => Boolean(req.user?.id) &&
  (req.user.role === "ADMIN" || order?.userId === req.user.id);
const isPaidEnough = (paidAmount, expectedAmount) => expectedAmount > 0 &&
  paidAmount > 0 && toMoney(paidAmount) + AMOUNT_EPSILON >= toMoney(expectedAmount);
const invoiceDto = (payment) => ({
  qr_text: payment.qrText,
  qr_image: payment.qrImage,
  invoice_id: payment.invoiceId,
  amount: payment.amount,
});
const invoiceError = (status, message, code) => Object.assign(new Error(message), { status, code });

export async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
  // Polls and webhooks share a token refresh instead of hammering the provider.
  if (!pendingToken) {
    pendingToken = (async () => {
      const response = await axios.post(`${QPAY_BASE_URL}/auth/token`, {
        username: process.env.QPAY_USERNAME,
        password: process.env.QPAY_PASSWORD,
      }, {
        auth: { username: process.env.QPAY_USERNAME, password: process.env.QPAY_PASSWORD },
        headers: { "Content-Type": "application/json" },
        timeout: REQUEST_TIMEOUT_MS,
      });
      const lifetime = Number(response.data?.expires_in);
      if (!response.data?.access_token || !Number.isFinite(lifetime) || lifetime <= 0) {
        throw new Error("QPay returned invalid access credentials");
      }
      cachedToken = response.data.access_token;
      tokenExpiry = Date.now() + Math.max(1, lifetime - 30) * 1000;
      return cachedToken;
    })().finally(() => { pendingToken = null; });
  }
  return pendingToken;
}

const notifyPayment = async (order, previousStatus) => {
  await Promise.allSettled([
    sendTelegramMessage(formatOrderStatusMessage(order, previousStatus, "PAID")),
    notifyCustomer(order.id, "PAID"),
  ]);
};

const verifyPayment = async (invoiceId) => {
  const token = await getAccessToken();
  const response = await axios.post(`${QPAY_BASE_URL}/payment/check`, {
    object_type: "INVOICE", object_id: invoiceId,
  }, { headers: { Authorization: `Bearer ${token}` }, timeout: REQUEST_TIMEOUT_MS });
  return toMoney(response.data?.paid_amount || 0);
};

export const createInvoice = async (req, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ error: "Unauthorized" });
    const orderId = req.body?.orderId;
    if (typeof orderId !== "string" || !orderId.trim() || orderId.length > 100) {
      return res.status(400).json({ error: "A valid orderId is required" });
    }
    const order = await prisma.foodOrder.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (!canAccessOrder(req, order)) return res.status(403).json({ error: "Forbidden" });
    if (order.paymentMethod !== "QPAY") {
      return res.status(400).json({ error: "This order is not configured for QPay" });
    }
    const assertPayable = (candidate) => {
      if (!candidate || !["PENDING", "WAITING_PAYMENT"].includes(candidate.status)) {
        throw invoiceError(409, "This order cannot receive a new invoice", "ORDER_NOT_PAYABLE");
      }
      if (new Date(candidate.createdAt).getTime() + PAYMENT_WINDOW_MS <= Date.now()) {
        throw invoiceError(409, "The payment window has expired", "PAYMENT_WINDOW_EXPIRED");
      }
      if (toMoney(candidate.totalPrice) <= 0) throw invoiceError(400, "Order amount is invalid");
    };
    assertPayable(order);
    const existing = await prisma.payment.findUnique({ where: { orderId } });
    if (existing?.status === "PENDING") return res.json(invoiceDto(existing));
    if (existing) throw invoiceError(409, "A payment already exists for this order", "PAYMENT_EXISTS");

    // Fetch credentials before acquiring a database lock. Keep all network waits bounded.
    const token = await getAccessToken();
    const payment = await prisma.$transaction(async (tx) => {
      // Updating the same value takes the row lock across workers. The second
      // request reuses the first request's invoice rather than orphaning its QR.
      const locked = await tx.foodOrder.updateMany({
        where: { id: orderId, status: { in: ["PENDING", "WAITING_PAYMENT"] } },
        data: { updatedAt: new Date() },
      });
      if (locked.count !== 1) throw invoiceError(409, "Order is no longer payable", "ORDER_NOT_PAYABLE");
      const current = await tx.foodOrder.findUnique({ where: { id: orderId } });
      assertPayable(current);
      const saved = await tx.payment.findUnique({ where: { orderId } });
      if (saved?.status === "PENDING") return saved;
      if (saved) throw invoiceError(409, "A payment already exists for this order", "PAYMENT_EXISTS");
      const amount = toMoney(current.totalPrice);
      const response = await axios.post(`${QPAY_BASE_URL}/invoice`, {
        invoice_code: process.env.QPAY_INVOICE_CODE,
        sender_invoice_no: `order_${crypto.createHash("sha256").update(orderId).digest("hex").slice(0, 26)}`,
        invoice_description: `Payment for order ${current.orderNumber || orderId}`,
        amount,
        callback_url: `${apiUrl()}/qpay/webhook`,
        sender_staff_code: "system",
        invoice_receiver_code: process.env.QPAY_USERNAME,
      }, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: REQUEST_TIMEOUT_MS,
      });
      const { invoice_id, qr_text, qr_image } = response.data || {};
      if (typeof invoice_id !== "string" || !invoice_id || typeof qr_text !== "string" || !qr_text) {
        throw new Error("QPay returned an invalid invoice");
      }
      return tx.payment.create({ data: {
        invoiceId: invoice_id, orderId, amount, status: "PENDING",
        qrText: qr_text, qrImage: typeof qr_image === "string" ? qr_image : null,
      } });
    }, { maxWait: 3000, timeout: 15000 });
    return res.json(invoiceDto(payment));
  } catch (err) {
    console.error("Create invoice failed:", err?.code || err?.message);
    const status = err.status || (err.code === "ECONNABORTED" ? 504 : 502);
    return res.status(status).json({
      error: err.status ? err.message : "Payment service is temporarily unavailable. Please try again.",
      ...(err.code && err.status ? { code: err.code } : {}),
    });
  }
};

export const checkPayment = async (req, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ error: "Unauthorized" });
    const invoiceId = req.body?.invoiceId;
    if (typeof invoiceId !== "string" || !invoiceId.trim() || invoiceId.length > 200) {
      return res.status(400).json({ error: "A valid invoiceId is required" });
    }
    const payment = await prisma.payment.findUnique({ where: { invoiceId } });
    if (!payment) return res.status(404).json({ error: "Payment record not found" });
    const beforeOrder = await prisma.foodOrder.findUnique({ where: { id: payment.orderId } });
    if (!beforeOrder) return res.status(404).json({ error: "Order not found" });
    if (!canAccessOrder(req, beforeOrder)) return res.status(403).json({ error: "Forbidden" });
    const expectedAmount = toMoney(payment.amount);
    // A verified receipt is durable; repeated polling need not contact QPay.
    const paidAmount = payment.status === "PAID" ? expectedAmount : await verifyPayment(invoiceId);
    if (!isPaidEnough(paidAmount, expectedAmount)) {
      return res.json({
        paid: false, underpaid: paidAmount > 0, expectedAmount, paidAmount,
        orderStatus: beforeOrder.status,
      });
    }
    const result = await confirmPaidOrder({ orderId: payment.orderId, invoiceId });
    if (result.changed) background(notifyPayment(result.order, beforeOrder.status));
    return res.json({
      paid: true, paidAmount, expectedAmount,
      orderStatus: result.order?.status ?? null, requiresReview: result.requiresReview,
    });
  } catch (err) {
    console.error("Check payment failed:", err?.code || err?.message);
    return res.status(err.code === "ECONNABORTED" ? 504 : 502).json({ error: "Check payment failed. Please try again." });
  }
};

export const webhook = async (req, res) => {
  try {
    const secret = process.env.QPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-qpay-signature"] || req.headers["x-signature"];
    if (secret) {
      if (!req.rawBody) return res.status(400).json({ error: "Bad request" });
      const computed = crypto.createHmac("sha256", secret).update(req.rawBody).digest("hex");
      const expected = Buffer.from(computed, "utf8");
      const received = Buffer.from(String(signature || ""), "utf8");
      if (!signature || expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
        return res.status(400).json({ error: "Invalid signature" });
      }
    }
    // Treat callback data only as a hint; always verify funds with QPay.
    const invoiceId = req.body?.invoice_id;
    if (typeof invoiceId !== "string" || !invoiceId.trim() || invoiceId.length > 200) {
      return res.status(400).json({ error: "A valid invoice_id is required" });
    }
    const payment = await prisma.payment.findUnique({ where: { invoiceId } });
    if (!payment) return res.json({ received: true, skipped: true });
    const beforeOrder = await prisma.foodOrder.findUnique({ where: { id: payment.orderId } });
    if (!beforeOrder) return res.json({ received: true, skipped: true });
    const paidAmount = payment.status === "PAID" ? toMoney(payment.amount) : await verifyPayment(invoiceId);
    if (!isPaidEnough(paidAmount, toMoney(payment.amount))) return res.json({ received: true });
    const result = await confirmPaidOrder({ orderId: payment.orderId, invoiceId });
    if (result.changed) background(notifyPayment(result.order, beforeOrder.status));
    if (result.requiresReview) console.warn("Received QPay funds for an order requiring review:", payment.orderId);
    return res.json({ received: true, requiresReview: result.requiresReview });
  } catch (err) {
    console.error("QPay webhook verification failed:", err?.code || err?.message);
    return res.status(502).json({ error: "Could not verify payment" });
  }
};
