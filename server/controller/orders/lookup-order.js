import { prisma } from "../../prismaClient.js";
import { paymentState } from "../../utils/paymentState.js";

const ORDER_NUMBER = /^[A-Z0-9-]{4,40}$/;
const digits = (value) => String(value ?? "").replace(/\D/g, "");

/**
 * A shopper (guest or not) checks an order with its number and the phone number given at checkout.
 * POST /order/lookup { orderNumber, phone }
 * Both must match, the answer is the same whichever one is wrong, and the reply leaves out the
 * name, street address and phone, so the form cannot be used to learn anything about other people.
 */
export const lookupOrder = async (req, res) => {
  const orderNumber = String(req.body?.orderNumber ?? "").trim().replace(/^#/, "").toUpperCase();
  const phone = digits(req.body?.phone);
  if (!ORDER_NUMBER.test(orderNumber) || phone.length < 6 || phone.length > 15) {
    return res.status(400).json({ code: "INVALID", message: "Enter the order number and the phone number used for the order." });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        lemonPayments: { select: { status: true } },
        orderItems: { include: { product: { select: { productName: true, image: true } } } },
      },
    });
    if (!order || digits(order.phone) !== phone) {
      return res.status(404).json({ code: "NOT_FOUND", message: "No order matches this number and phone." });
    }
    const payment = await prisma.payment.findFirst({ where: { orderId: order.id }, select: { status: true } });

    return res.status(200).json({
      orderNumber: order.orderNumber,
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentStatus: paymentState(order, payment),
      totalPrice: order.totalPrice,
      deliveryFee: order.deliveryFee,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      city: order.city ?? null,
      district: order.district ?? null,
      items: (order.orderItems ?? []).map((item) => ({
        productName: item.product?.productName ?? "",
        image: item.product?.image ?? null,
        size: item.size ?? null,
        quantity: item.quantity,
        lineTotal: item.unitPrice == null ? null : Number((item.unitPrice * item.quantity).toFixed(2)),
      })),
    });
  } catch (error) {
    console.error("ORDER LOOKUP ERROR:", error?.message || error);
    return res.status(500).json({ code: "FAILED", message: "The order could not be checked. Please try again." });
  }
};
