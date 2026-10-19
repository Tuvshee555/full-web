import { prisma } from "../../prismaClient.js";
import {
  sendTelegramMessage,
  formatOrderStatusMessage,
} from "../../utils/telegram.js";
import { sendEmail } from "../../utils/sendEmail.js";
import { orderStatusChangedEmail } from "../../utils/emailTemplates.js";
import { restockOrder } from "../../utils/stock.js";
import { incrementSalesForOrder } from "../../utils/orderPaid.js";
import { background } from "../../utils/background.js";
import { invalidateCatalog } from "../../utils/cache.js";
import { isGuestEmail } from "../../utils/serializeUser.js";

const ALLOWED_TRANSITIONS = {
  PENDING: ["WAITING_PAYMENT", "COD_PENDING", "CANCELLED"],
  WAITING_PAYMENT: ["PAID", "CANCELLED"],
  COD_PENDING: ["DELIVERING", "CANCELLED"],
  PAID: ["DELIVERING"],
  DELIVERING: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

const CUSTOMER_EDITABLE_STATUSES = new Set([
  "PENDING",
  "WAITING_PAYMENT",
  "COD_PENDING",
]);

export const updatedFoodOrder = async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: "Order ID required" });

  const {
    status,
    firstName,
    lastName,
    phone,
    city,
    district,
    khoroo,
    address,
    notes,
  } = req.body ?? {};

  try {
    const requesterId = req.user?.id;
    const requesterRole = req.user?.role;

    if (!requesterId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const existing = await prisma.foodOrder.findUnique({
      where: { id },
      include: {
        foodOrderItems: { include: { food: true } },
      },
    });

    if (!existing) {
      return res.status(404).json({ message: "Order not found" });
    }

    const hasDeliveryUpdate = [
      firstName,
      lastName,
      phone,
      city,
      district,
      khoroo,
      address,
      notes,
    ].some((value) => value !== undefined);

    if (requesterRole !== "ADMIN" && existing.userId !== requesterId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (requesterRole !== "ADMIN") {
      if (status !== undefined) {
        return res.status(403).json({ message: "Only admins can change order status" });
      }

      if (!CUSTOMER_EDITABLE_STATUSES.has(existing.status)) {
        return res.status(409).json({
          message: "This order can no longer be edited by the customer",
        });
      }
    }

    if (status === undefined && !hasDeliveryUpdate) {
      return res.status(400).json({ message: "No valid fields provided to update" });
    }

    if (status !== undefined) {
      if (typeof status !== "string" || !Object.hasOwn(ALLOWED_TRANSITIONS, status)) {
        return res.status(400).json({ message: "Invalid order status" });
      }
      const allowed = ALLOWED_TRANSITIONS[existing.status] || [];
      if (!allowed.includes(status)) {
        return res.status(400).json({
          message: `Invalid status transition: ${existing.status} â†’ ${status}`,
        });
      }
      if (status === "PAID" && existing.paymentMethod === "QPAY") {
        return res.status(400).json({ message: "QPay payments must be verified with the payment provider" });
      }
      if ((status === "COD_PENDING" && existing.paymentMethod !== "COD") ||
          (status === "WAITING_PAYMENT" && existing.paymentMethod === "COD")) {
        return res.status(400).json({ message: "Order status does not match its payment method" });
      }
    }

    const safe = (v) =>
      typeof v === "string" && v.trim().length ? v.trim() : null;

    const data = {};
    if (status) data.status = status;
    if (firstName !== undefined) data.firstName = safe(firstName);
    if (lastName !== undefined) data.lastName = safe(lastName);
    if (phone !== undefined) data.phone = safe(phone);
    if (city !== undefined) data.city = safe(city);
    if (district !== undefined) data.district = safe(district);
    if (khoroo !== undefined) data.khoroo = safe(khoroo);
    if (address !== undefined) data.address = safe(address);
    if (notes !== undefined) data.notes = safe(notes);

    const updated = await prisma.$transaction(async (tx) => {
      const claimed = await tx.foodOrder.updateMany({
        where: { id, status: existing.status, updatedAt: existing.updatedAt },
        data,
      });
      if (claimed.count !== 1) return null;
      if (status === "PAID" || (status === "DELIVERED" && existing.paymentMethod === "COD")) {
        await incrementSalesForOrder(id, tx);
      }
      if (status === "CANCELLED") await restockOrder(id, tx);
      return tx.foodOrder.findUnique({
        where: { id },
        include: { foodOrderItems: { include: { food: true } } },
      });
    });
    if (!updated) return res.status(409).json({
      message: "This order changed while you were editing it. Refresh and try again.",
    });
    if (status === "CANCELLED" || status === "PAID" || status === "DELIVERED") invalidateCatalog();

    const oldStatus = existing.status;
    const newStatus = updated.status;

    console.log("STATUS CHANGE:", oldStatus, "â†’", newStatus);

    const IMPORTANT = new Set([
      "PAID",
      "CANCELLED",
      "DELIVERING",
      "DELIVERED",
    ]);

    background((async () => {
      if (status && oldStatus !== newStatus && IMPORTANT.has(newStatus)) {
        try {
          await sendTelegramMessage(
            formatOrderStatusMessage(updated, oldStatus, newStatus)
          );
        } catch (tgErr) {
          console.error("âŒ Telegram notify failed:", tgErr);
        }
      }

      const EMAIL_STATUSES = new Set([
        "DELIVERING",
        "DELIVERED",
        "CANCELLED",
      ]);

      if (status && oldStatus !== newStatus && EMAIL_STATUSES.has(newStatus)) {
        try {
          const user = await prisma.user.findUnique({
            where: { id: updated.userId },
            select: { email: true },
          });

          if (!isGuestEmail(user?.email)) {
            await sendEmail({
              to: user.email,
              subject:
                newStatus === "DELIVERING"
                  ? `ðŸšš Ð—Ð°Ñ…Ð¸Ð°Ð»Ð³Ð° Ð·Ð°Ð¼Ð´Ð°Ð° ÑÐ²Ð¶ Ð±Ð°Ð¹Ð½Ð° #${updated.orderNumber}`
                  : newStatus === "DELIVERED"
                  ? `ðŸ Ð—Ð°Ñ…Ð¸Ð°Ð»Ð³Ð° Ñ…Ò¯Ñ€Ð³ÑÐ³Ð´Ð»ÑÑ #${updated.orderNumber}`
                  : `âŒ Ð—Ð°Ñ…Ð¸Ð°Ð»Ð³Ð° Ñ†ÑƒÑ†Ð»Ð°Ð³Ð´Ð»Ð°Ð° #${updated.orderNumber}`,
              html: orderStatusChangedEmail(
                updated,
                oldStatus,
                newStatus
              ),
            });
          }
        } catch (mailErr) {
          console.error("âŒ Customer email failed:", mailErr);
        }
      }

    })());

    return res.status(200).json({
      id: updated.id,
      orderNumber: updated.orderNumber,
      status: updated.status,
      paymentMethod: updated.paymentMethod,
      totalPrice: updated.totalPrice,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      delivery: {
        firstName: updated.firstName,
        lastName: updated.lastName,
        phone: updated.phone,
        city: updated.city,
        district: updated.district,
        khoroo: updated.khoroo,
        address: updated.address,
        notes: updated.notes,
      },
      items: updated.foodOrderItems.map((it) => ({
        id: it.id,
        quantity: it.quantity,
        size: it.size,
        food: {
          id: it.food.id,
          foodName: it.food.foodName,
          price: it.food.price,
          image: it.food.image,
        },
      })),
    });
  } catch (error) {
    console.error("UPDATE ORDER ERROR:", error);
    return res.status(500).json({ message: "Failed to update order" });
  }
};
