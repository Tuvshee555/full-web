import dotenv from "dotenv";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
dotenv.config({ path: [".env.local", ".env"], quiet: true });
// This test process has no outbound notification credentials.
for (const key of ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID", "SMTP_HOST", "SMTP_USER", "SMTP_PASS"]) delete process.env[key];
const { prisma } = await import("../server/utils/prisma.js");
const { createFoodOrder } = await import("../server/controller/orders/create-orders.js");
const { backgroundSettled } = await import("../server/utils/background.js");
const tag = randomUUID();
let user;
let order;
let size;
try {
  const foods = await prisma.food.findMany({ include: { sizes: true } });
  const product = foods.find((f) => f.price > 0 && (!f.sizes.length || f.sizes.some((s) => s.stock == null || s.stock > 0)));
  assert.ok(product, "A purchasable catalogue product is required");
  size = product.sizes.find((s) => s.stock == null || s.stock > 0);
  user = await prisma.user.create({ data: { email: `chatbot-qa-${tag}@guest.invalid`, firstName: "Тест", lastName: "Захиалга" } });
  const payload = { idempotencyKey: `chatbot-qa-${tag}`, paymentMethod: "BANK", firstName: "Тест", lastName: "Захиалга", phone: "00000001", items: [{ foodId: product.id, quantity: 1, size: size?.label }], deliveryZone: "UB" };
  let code;
  let response;
  const res = { status(value) { code = value; return this; }, json(value) { response = value; return this; } };
  await createFoodOrder({ user: { id: user.id }, body: payload }, res);
  assert.equal(code, 201);
  order = await prisma.foodOrder.findUniqueOrThrow({ where: { id: response.orderId } });
  assert.equal(order.firstName, "Тест");
  assert.equal(order.lastName, "Захиалга");
  assert.equal(order.paymentMethod, "BANK");
  assert.equal(order.status, "WAITING_PAYMENT");
  if (size?.stock != null) assert.equal((await prisma.foodSize.findUnique({ where: { id: size.id } })).stock, size.stock - 1);
  await createFoodOrder({ user: { id: user.id }, body: payload }, res);
  assert.equal(code, 200);
  assert.equal(response.orderId, order.id);
  console.log("BANK order creation, stock reservation and idempotent replay: PASS");
} finally {
  await backgroundSettled();
  if (user) {
    await prisma.$transaction(async (tx) => {
      const ownOrders = await tx.foodOrder.findMany({ where: { userId: user.id, firstName: "Тест", lastName: "Захиалга" }, include: { foodOrderItems: true } });
      for (const own of ownOrders) {
        if (own.status !== "CANCELLED") for (const item of own.foodOrderItems) {
          if (item.size) await tx.foodSize.updateMany({ where: { foodId: item.foodId, label: item.size, stock: { not: null } }, data: { stock: { increment: item.quantity } } });
        }
        await tx.payment.deleteMany({ where: { orderId: own.id } });
        await tx.lemonPayment.deleteMany({ where: { orderId: own.id } });
        await tx.orderItem.deleteMany({ where: { orderId: own.id } });
        await tx.foodOrder.delete({ where: { id: own.id } });
      }
      await tx.user.delete({ where: { id: user.id } });
    });
  }
  await prisma.$disconnect();
  console.log("Exact test-user cleanup and transactional stock restoration: complete");
}
