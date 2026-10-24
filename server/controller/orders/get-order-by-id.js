// controller/orders/get-order-by-id.js
import { prisma } from "../../prismaClient.js";
import { paymentState } from "../../utils/paymentState.js";

export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const requesterId = req.user?.id;
    const requesterRole = req.user?.role;

    if (!requesterId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!id) {
      return res.status(400).json({ message: "Order ID is required" });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        lemonPayments: { select: { status: true } },
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (requesterRole !== "ADMIN" && order.userId !== requesterId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // 🔑 Get latest payment (for QPay QR re-display)
    const payment = await prisma.payment.findFirst({
      where: { orderId: id },
      orderBy: { createdAt: "desc" },
      select: {
        invoiceId: true,
        amount: true,
        status: true,
        qrText: true,
        qrImage: true,
        createdAt: true,
      },
    });

    return res.status(200).json({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentStatus: paymentState(order, payment),
      totalPrice: order.totalPrice,
      deliveryFee: order.deliveryFee,
      deliveryZone: order.deliveryZone,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,

      delivery: {
        firstName: order.firstName,
        lastName: order.lastName,
        phone: order.phone,
        city: order.city,
        district: order.district,
        khoroo: order.khoroo,
        address: order.address,
        notes: order.notes,
      },

      items: order.orderItems.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        size: item.size,
        unitPrice: item.unitPrice ?? null,
        lineTotal: item.unitPrice == null ? null : Number((item.unitPrice * item.quantity).toFixed(2)),
        product: {
          id: item.product.id,
          productName: item.product.productName,
          // what the customer paid for one unit (lines before 2026-10-19 have no stored price)
          price: item.unitPrice ?? item.product.price,
          image: item.product.image,
        },
      })),

      // 👇 THIS IS THE IMPORTANT PART
      payment: payment || null,
    });
  } catch (error) {
    console.error("GET ORDER BY ID ERROR:", error);
    return res.status(500).json({ message: "Failed to load order" });
  }
};
