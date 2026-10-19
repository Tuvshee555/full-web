import { prisma } from "../../prismaClient.js";
import {
  sendTelegramMessage,
  formatOrderStatusMessage,
} from "../../utils/telegram.js";
import { notifyCustomer } from "../../utils/orderNotify.js";
import { restockOrder } from "../../utils/stock.js";

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
  } = req.body;

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

    if (status) {
      const allowed = ALLOWED_TRANSITIONS[existing.status] || [];
      if (!allowed.includes(status)) {
        return res.status(400).json({
          message: `Invalid status transition: ${existing.status} → ${status}`,
        });
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

    const updated = await prisma.foodOrder.update({
      where: { id },
      data,
      include: {
        foodOrderItems: { include: { food: true } },
      },
    });

    const oldStatus = existing.status;
    const newStatus = updated.status;

    console.log("STATUS CHANGE:", oldStatus, "->", newStatus);

    const shouldCountSale =
      status &&
      oldStatus !== "PAID" &&
      newStatus === "PAID";

    if (shouldCountSale) {
      try {
        for (const item of updated.foodOrderItems) {
          await prisma.food.update({
            where: { id: item.food.id },
            data: {
              salesCount: {
                increment: item.quantity,
              },
            },
          });
        }

        console.log(
          "Sales count incremented for order:",
          updated.orderNumber
        );
      } catch (salesErr) {
        console.error("Failed to increment salesCount:", salesErr);
      }
    }

    // Cancelling an order releases the stock it had reserved.
    if (status && oldStatus !== "CANCELLED" && newStatus === "CANCELLED") {
      await restockOrder(id);
    }

    const IMPORTANT = new Set([
      "PAID",
      "CANCELLED",
      "DELIVERING",
      "DELIVERED",
    ]);

    if (status && oldStatus !== newStatus && IMPORTANT.has(newStatus)) {
      try {
        await sendTelegramMessage(
          formatOrderStatusMessage(updated, oldStatus, newStatus)
        );
      } catch (tgErr) {
        console.error("Telegram notify failed:", tgErr);
      }
    }

    // Customer email for every status a customer cares about. PAID covers a bank
    // transfer the owner confirms here (QPay payments are emailed by the QPay controller).
    const EMAIL_STATUSES = new Set(["PAID", "DELIVERING", "DELIVERED", "CANCELLED"]);

    if (status && oldStatus !== newStatus && EMAIL_STATUSES.has(newStatus)) {
      await notifyCustomer(updated.id, newStatus);
    }

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
