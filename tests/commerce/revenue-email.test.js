import test from "node:test";
import assert from "node:assert/strict";
import { businessDateKey, businessDayStart, revenueWindows, REVENUE_WHERE } from "../../server/utils/revenue.js";
import { orderEmail } from "../../server/utils/emailTemplates.js";

test("revenue windows and chart buckets share Ulaanbaatar midnight/month boundaries", () => {
  const now = new Date("2026-10-31T17:30:00.000Z");
  assert.equal(businessDateKey(now), "2026-11-01");
  assert.equal(businessDayStart(now).toISOString(), "2026-10-31T16:00:00.000Z");
  const windows = revenueWindows(now);
  assert.equal(windows.monthStart.toISOString(), "2026-10-31T16:00:00.000Z");
  assert.equal(windows.weekStart.toISOString(), "2026-10-25T16:00:00.000Z");
  assert.deepEqual(REVENUE_WHERE.OR[1], { paymentMethod: "COD", status: "DELIVERED" });
});

test("order emails escape customer/product HTML and use a working localized order link", () => {
  const { html, subject } = orderEmail("created", { id: "test-id", orderNumber: "<img src=x>", firstName: "<script>alert(1)</script>", lastName: "Test", address: "<iframe>bad</iframe>", notes: "<img src=x onerror=evil>", totalPrice: 100, orderItems: [{ product: { productName: "<script>product</script>" }, quantity: 1 }] });
  assert.ok(subject.length > 0);
  assert.equal(html.includes("<script>"), false);
  assert.equal(html.includes("<iframe>"), false);
  assert.equal(html.includes("<img src=x"), false);
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("/mn/profile/orders/test-id"));
  assert.ok(html.includes("Lorentz"));
});
