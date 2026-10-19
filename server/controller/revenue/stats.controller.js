import { prisma } from "../../prismaClient.js";
import { REVENUE_WHERE, businessDateKey, revenueWindows } from "../../utils/revenue.js";

// All payment methods share the same source of truth as the admin dashboard.
export const getRevenueStats = async (_req, res) => {
  try {
    const { monthStart, weekStart } = revenueWindows();
    const [total, month, week] = await Promise.all([undefined, monthStart, weekStart].map((start) => prisma.foodOrder.aggregate({
      _sum: { totalPrice: true }, where: { ...REVENUE_WHERE, ...(start ? { createdAt: { gte: start } } : {}) },
    })));
    return res.json({ totalRevenue: total._sum.totalPrice ?? 0, monthlyRevenue: month._sum.totalPrice ?? 0, weeklyRevenue: week._sum.totalPrice ?? 0 });
  } catch (error) {
    console.error("Revenue stats failed:", error?.code || "DATABASE_ERROR");
    return res.status(500).json({ error: "Failed to fetch revenue stats" });
  }
};

export const getPaymentsStats = async (_req, res) => {
  try {
    const { weekStart } = revenueWindows();
    const select = { id: true, orderNumber: true, totalPrice: true, createdAt: true, status: true };
    const [orders, recent] = await Promise.all([
      prisma.foodOrder.findMany({ where: { ...REVENUE_WHERE, createdAt: { gte: weekStart } }, select }),
      prisma.foodOrder.findMany({ where: REVENUE_WHERE, orderBy: { createdAt: "desc" }, take: 10, select }),
    ]);
    const days = new Map(Array.from({ length: 7 }, (_, index) => [businessDateKey(new Date(weekStart.getTime() + index * 86400000)), 0]));
    for (const order of orders) {
      const day = businessDateKey(order.createdAt);
      if (days.has(day)) days.set(day, days.get(day) + Number(order.totalPrice));
    }
    return res.json({ dailyRevenue: Array.from(days, ([date, revenue]) => ({ date, revenue })), recentPayments: recent.map((order) => ({ id: order.id, orderId: order.id, amount: order.totalPrice, status: order.status, createdAt: order.createdAt })) });
  } catch (error) {
    console.error("Payment stats failed:", error?.code || "DATABASE_ERROR");
    return res.status(500).json({ error: "Failed to fetch payments" });
  }
};
