// controller/orders/create-orders.js
// HTTP boundary of checkout: validates the request, then placeOrder() (server/services/placeOrder.js)
// prices it, reserves stock and creates it, exactly as the chat assistant's orders are created.
import { OrderError, notifyNewOrder, placeOrder, toOrderResponse } from "../../services/placeOrder.js";

export const createOrder = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { totalPrice, paymentMethod, deliveryZone, idempotencyKey, firstName, lastName, phone, city, district, khoroo, address, notes } = req.body ?? {};
    const items = req.body?.items ?? req.body?.normalizedItems;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const safeKey = typeof idempotencyKey === "string" && idempotencyKey.trim().length ? idempotencyKey.trim() : null;
    if (safeKey?.length > 100) return res.status(400).json({ message: "Invalid checkout key" });

    // No card payments: QPay, bank transfer, or cash on delivery only.
    if (!paymentMethod || !["COD", "BANK", "QPAY"].includes(paymentMethod)) {
      return res.status(400).json({ message: "Invalid payment method" });
    }
    if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
      return res.status(400).json({ message: "Provide between 1 and 100 order items" });
    }

    const safe = (v) => (typeof v === "string" && v.trim().length ? v.trim() : null);
    const deliveryFields = { firstName, lastName, phone, city, district, khoroo, address, notes };
    for (const [field, value] of Object.entries(deliveryFields)) {
      const maxLength = field === "notes" ? 2000 : field === "address" ? 1000 : 120;
      if (value != null && (typeof value !== "string" || value.length > maxLength)) {
        return res.status(400).json({ message: `Invalid ${field}` });
      }
      if (field !== "notes" && !safe(value)) {
        return res.status(400).json({ message: `Delivery ${field} is required` });
      }
    }
    if (!/^\+?[\d\s()-]{8,20}$/.test(phone) || phone.replace(/\D/g, "").length < 8) {
      return res.status(400).json({ message: "A valid delivery phone number is required" });
    }

    let result;
    try {
      result = await placeOrder({ userId, items, paymentMethod, deliveryZone, idempotencyKey: safeKey, totalPrice, firstName, lastName, phone, city, district, khoroo, address, notes });
    } catch (error) {
      if (error instanceof OrderError) {
        if (error.code === "PRICE_CHANGED") return res.status(409).json({ code: "PRICE_CHANGED", message: error.message, ...error.extra });
        return res.status(error.status).json({ message: error.message, ...error.extra });
      }
      throw error;
    }
    if (result.replayed) return res.status(200).json(toOrderResponse(result.order));

    res.status(201).json(toOrderResponse(result.order));
    notifyNewOrder(result.order.id);
  } catch (err) {
    console.error("CREATE ORDER ERROR:", err);
    return res.status(500).json({ message: "Order creation failed" });
  }
};
