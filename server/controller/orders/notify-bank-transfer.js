import { prisma } from "../../prismaClient.js";
import { formatBankTransferNotice, sendTelegramMessage } from "../../utils/telegram.js";

// "I've transferred" button: tells the owner on Telegram to check the bank statement.
// One alert per order per 10 minutes, so the button cannot flood the owner's phone.
const COOLDOWN_MS = 10 * 60 * 1000;
const MAX_REMEMBERED = 500;
const lastAlert = new Map();

export const notifyBankTransfer = async (req, res) => {
  const { id } = req.params;
  const requesterId = req.user?.id;
  if (!requesterId) return res.status(401).json({ message: "Unauthorized" });
  if (!id || id.length > 100) return res.status(400).json({ message: "Order ID is required" });

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      select: { id: true, userId: true, orderNumber: true, status: true, paymentMethod: true, totalPrice: true, firstName: true, lastName: true, phone: true },
    });
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (req.user.role !== "ADMIN" && order.userId !== requesterId) return res.status(403).json({ message: "Forbidden" });
    if (order.paymentMethod !== "BANK" || order.status !== "WAITING_PAYMENT") {
      return res.status(409).json({ message: "This order is not waiting for a bank transfer" });
    }

    // A repeat tap inside the cooldown is answered as success without alerting again.
    if (Date.now() - (lastAlert.get(id) ?? 0) < COOLDOWN_MS) return res.status(200).json({ notified: true, repeated: true });
    lastAlert.set(id, Date.now());
    if (lastAlert.size > MAX_REMEMBERED) lastAlert.delete(lastAlert.keys().next().value);

    const sent = await sendTelegramMessage(formatBankTransferNotice(order));
    return res.status(200).json({ notified: true, delivered: sent });
  } catch (error) {
    console.error("Bank transfer notice failed:", error?.message);
    return res.status(500).json({ message: "Failed to send the notice" });
  }
};
