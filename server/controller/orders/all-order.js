import { prisma } from "../../prismaClient.js";
import { REVENUE_WHERE, businessDateKey, revenueWindows } from "../../utils/revenue.js";
const ORDER_STATUSES = new Set([
  "PENDING",
  "WAITING_PAYMENT",
  "COD_PENDING",
  "PAID",
  "DELIVERING",
  "DELIVERED",
  "CANCELLED",
]);

const parsePositiveInt = (value, fallback, max = 100) => {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
};

const toOrderDto = (order) => ({
  id: order.id,
  orderNumber: order.orderNumber,
  status: order.status,
  paymentMethod: order.paymentMethod,
  totalPrice: order.totalPrice,
  deliveryFee: order.deliveryFee,
  deliveryZone: order.deliveryZone,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
  firstName: order.firstName,
  lastName: order.lastName,
  phone: order.phone,
  city: order.city,
  district: order.district,
  khoroo: order.khoroo,
  address: order.address,
  notes: order.notes,
  user: order.user
    ? {
        id: order.user.id,
        email: order.user.email,
        address: order.user.address,
      }
    : null,
  orderItems: (order.orderItems ?? []).map((item) => ({
    id: item.id,
    quantity: item.quantity,
    size: item.size,
    product: item.product
      ? {
          id: item.product.id,
          productName: item.product.productName,
          image: item.product.image,
          // what the customer paid for one unit (lines before 2026-10-19 have no stored price)
          price: item.unitPrice ?? item.product.price,
          categoryId: item.product.categoryId,
        }
      : null,
  })),
  itemsCount: order.orderItems?.length ?? 0,
});

export const getAllOrder = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Admin only" });
    }

    if (req.query.mode === "revenue") {
      const { monthStart, weekStart, chartStart } = revenueWindows(new Date());

      const [
        totalRevenueAgg,
        weeklyRevenueAgg,
        monthlyRevenueAgg,
        recentRevenueOrders,
        recentPayments,
      ] = await Promise.all([
        prisma.order.aggregate({
          where: REVENUE_WHERE,
          _sum: { totalPrice: true },
        }),
        prisma.order.aggregate({
          where: {
            ...REVENUE_WHERE,
            createdAt: { gte: weekStart },
          },
          _sum: { totalPrice: true },
        }),
        prisma.order.aggregate({
          where: {
            ...REVENUE_WHERE,
            createdAt: { gte: monthStart },
          },
          _sum: { totalPrice: true },
        }),
        prisma.order.findMany({
          where: {
            ...REVENUE_WHERE,
            createdAt: { gte: chartStart },
          },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            orderNumber: true,
            totalPrice: true,
            status: true,
            createdAt: true,
          },
        }),
        prisma.order.findMany({
          where: REVENUE_WHERE,
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            orderNumber: true,
            totalPrice: true,
            status: true,
            createdAt: true,
          },
        }),
      ]);

      const chartMap = new Map();
      for (const order of recentRevenueOrders) {
        const dateKey = businessDateKey(order.createdAt);
        const day = chartMap.get(dateKey) ?? { revenue: 0, orders: 0 };
        day.revenue += Number(order.totalPrice ?? 0);
        day.orders += 1;
        chartMap.set(dateKey, day);
      }

      const chartData = Array.from(chartMap.entries()).map(([date, day]) => ({
        date,
        revenue: day.revenue,
        orders: day.orders,
      }));

      return res.status(200).json({
        stats: {
          totalRevenue: totalRevenueAgg._sum.totalPrice ?? 0,
          weeklyRevenue: weeklyRevenueAgg._sum.totalPrice ?? 0,
          monthlyRevenue: monthlyRevenueAgg._sum.totalPrice ?? 0,
        },
        chartData,
        payments: recentPayments.map((order) => ({
          id: order.id,
          orderId: order.orderNumber ?? order.id,
          amount: Number(order.totalPrice ?? 0),
          status: order.status,
          createdAt: order.createdAt,
        })),
      });
    }

    const page = parsePositiveInt(req.query.page, 1, 100000);
    const limit = parsePositiveInt(req.query.limit, 10, 100);
    const search = String(req.query.search ?? "").trim();
    // ?status=PAID or ?status=PENDING,WAITING_PAYMENT (unknown values ignored)
    const statuses = String(req.query.status ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => ORDER_STATUSES.has(s));

    const searchWhere = search
      ? {
          OR: [
            { orderNumber: { contains: search, mode: "insensitive" } },
            { id: { contains: search, mode: "insensitive" } },
            { phone: { contains: search } },
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};
    const where = statuses.length
      ? { ...searchWhere, status: { in: statuses } }
      : searchWhere;

    const [total, statusGroups, orders] = await Promise.all([
      prisma.order.count({ where }),
      // Per-status counts for the admin's filter tabs (search applied, status not)
      prisma.order.groupBy({
        by: ["status"],
        where: searchWhere,
        _count: { _all: true },
      }),
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              address: true,
            },
          },
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  productName: true,
                  image: true,
                  price: true,
                  categoryId: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return res.status(200).json({
      orders: orders.map(toOrderDto),
      counts: Object.fromEntries(
        statusGroups.map((g) => [g.status, g._count._all])
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error("GET ALL ORDERS ERROR:", error);
    return res.status(500).json({ message: "Failed to fetch orders" });
  }
};
