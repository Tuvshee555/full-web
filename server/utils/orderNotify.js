// The one way order emails reach a customer. Loads the order with its lines,
// refuses addresses that cannot be a real inbox, and never throws: a failed
// email must not break checkout, a payment or a status change.
import { prisma } from "../prismaClient.js";
import { sendEmail } from "./sendEmail.js";
import { orderEmail } from "./emailTemplates.js";

/**
 * Guest checkouts get a made-up address. New ones end in "@guest.invalid" (a
 * domain that can never receive mail); older ones end in "@guest.com", which
 * is somebody else's real domain, so mailing it would hand them the order.
 */
export function isDeliverableEmail(email) {
  if (typeof email !== "string") return false;
  const e = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return false;
  if (e.startsWith("guest-") && /@guest\.(com|invalid)$/.test(e)) return false;
  return !e.endsWith(".invalid");
}

/** kind: "created" | "PAID" | "DELIVERING" | "DELIVERED" | "CANCELLED". Returns true when an email was sent. */
export async function notifyCustomer(orderId, kind) {
  try {
    const order = await prisma.foodOrder.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { email: true } },
        foodOrderItems: { include: { food: { select: { foodName: true, price: true } } } },
      },
    });
    const to = order?.user?.email;
    if (!order || !isDeliverableEmail(to)) return false;
    const { subject, html } = orderEmail(kind, order);
    await sendEmail({ to, subject, html });
    return true;
  } catch (err) {
    console.error("Customer email failed:", kind, err?.message || err);
    return false;
  }
}
