import { prisma } from "../../prismaClient.js";
import { REVENUE_WHERE } from "../../utils/revenue.js";

const SORTS = new Set(["recent", "spent", "orders"]);
// Enough for a small shop's search box; a broader search should be narrowed first.
const MAX_MATCHED_PHONES = 500;

const parsePositiveInt = (value, fallback, max = 100) => {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
};

const time = (value) => (value ? new Date(value).getTime() : 0);

/**
 * Customers are the people who ordered, recognised by the delivery phone number (so guests count too).
 * GET /order/customers?search=&sort=recent|spent|orders&page=&limit=   or   ?phone=<digits> for one customer.
 * "spent" only counts orders that brought money in (same rule as the revenue reports).
 */
export const getCustomers = async (req, res) => {
  try {
    const search = String(req.query.search ?? "").trim().slice(0, 60);
    const phone = String(req.query.phone ?? "").replace(/\D/g, "").slice(0, 20);
    const sort = SORTS.has(req.query.sort) ? req.query.sort : "recent";
    const page = parsePositiveInt(req.query.page, 1, 100000);
    const limit = parsePositiveInt(req.query.limit, 25, 100);

    // A name search must still count every order of the matching customers, not only the orders with that name.
    let scope = { phone: { not: null } };
    if (phone) {
      scope = { phone };
    } else if (search) {
      const digits = search.replace(/[\s-]/g, "");
      const matched = await prisma.order.findMany({
        where: {
          phone: { not: null },
          OR: [
            ...(/^\d+$/.test(digits) ? [{ phone: { contains: digits } }] : []),
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
          ],
        },
        select: { phone: true },
        distinct: ["phone"],
        take: MAX_MATCHED_PHONES,
      });
      scope = { phone: { in: matched.map((row) => row.phone) } };
    }

    const [groups, paid] = await Promise.all([
      prisma.order.groupBy({ by: ["phone"], where: scope, _count: { _all: true }, _min: { createdAt: true }, _max: { createdAt: true } }),
      prisma.order.groupBy({ by: ["phone"], where: { AND: [scope, REVENUE_WHERE] }, _count: { _all: true }, _sum: { totalPrice: true } }),
    ]);
    const paidByPhone = new Map(paid.map((row) => [row.phone, row]));
    const all = groups
      .filter((row) => row.phone)
      .map((row) => ({
        phone: row.phone,
        orders: row._count._all,
        paidOrders: paidByPhone.get(row.phone)?._count._all ?? 0,
        spent: Number(paidByPhone.get(row.phone)?._sum.totalPrice ?? 0),
        firstOrderAt: row._min.createdAt,
        lastOrderAt: row._max.createdAt,
      }));
    const order = {
      recent: (a, b) => time(b.lastOrderAt) - time(a.lastOrderAt),
      spent: (a, b) => b.spent - a.spent || time(b.lastOrderAt) - time(a.lastOrderAt),
      orders: (a, b) => b.orders - a.orders || time(b.lastOrderAt) - time(a.lastOrderAt),
    }[sort];
    all.sort(order);

    const rows = all.slice((page - 1) * limit, page * limit);
    // Name and town as given on the customer's most recent order.
    const latest = rows.length
      ? await prisma.order.findMany({
          where: { phone: { in: rows.map((row) => row.phone) } },
          orderBy: { createdAt: "desc" },
          distinct: ["phone"],
          select: { phone: true, firstName: true, lastName: true, city: true, district: true, user: { select: { email: true } } },
        })
      : [];
    const detailByPhone = new Map(latest.map((row) => [row.phone, row]));

    return res.status(200).json({
      customers: rows.map((row) => {
        const detail = detailByPhone.get(row.phone);
        return {
          ...row,
          firstName: detail?.firstName ?? null,
          lastName: detail?.lastName ?? null,
          city: detail?.city ?? null,
          district: detail?.district ?? null,
          email: detail?.user?.email ?? null,
        };
      }),
      summary: {
        customers: all.length,
        repeat: all.filter((row) => row.paidOrders >= 2).length,
      },
      pagination: { page, limit, total: all.length, totalPages: Math.max(1, Math.ceil(all.length / limit)) },
    });
  } catch (error) {
    console.error("GET CUSTOMERS ERROR:", error);
    return res.status(500).json({ message: "Failed to fetch customers" });
  }
};
