// Reporting uses the shop's Ulaanbaatar business day, independent of host TZ.
const OFFSET = 8 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;
export const REVENUE_WHERE = {
  OR: [
    { paymentMethod: { not: "COD" }, status: { in: ["PAID", "DELIVERING", "DELIVERED"] } },
    { paymentMethod: "COD", status: "DELIVERED" },
  ],
};
export const businessDateKey = (value) => new Date(new Date(value).getTime() + OFFSET).toISOString().slice(0, 10);
export function businessDayStart(value) {
  const date = new Date(new Date(value).getTime() + OFFSET);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - OFFSET);
}
export function revenueWindows(now = new Date()) {
  const local = new Date(now.getTime() + OFFSET);
  const today = businessDayStart(now);
  return {
    monthStart: new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - OFFSET),
    weekStart: new Date(today.getTime() - 6 * DAY),
    chartStart: new Date(today.getTime() - 59 * DAY),
  };
}
