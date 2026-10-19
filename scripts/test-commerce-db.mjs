// Opt-in integration tests. Always creates its OWN temporary PostgreSQL cluster;
// never reads or writes the development/production database or .local-db.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import EmbeddedPostgres from "embedded-postgres";
import { PrismaClient } from "@prisma/client";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = 5441;
const database = "commerce_integration";
const password = crypto.randomBytes(16).toString("hex");
const url = `postgresql://postgres:${password}@127.0.0.1:${port}/${database}?sslmode=disable&connection_limit=12`;
const temporaryPrefix = path.join(os.tmpdir(), "eyebrow-commerce-");
const directory = await mkdtemp(temporaryPrefix);
const pg = new EmbeddedPostgres({
  databaseDir: path.join(directory, "postgres"), port, user: "postgres", password,
  persistent: true,
  initdbFlags: ["--encoding=UTF8", "--locale=C", "--no-sync"],
  postgresFlags: ["-c", "listen_addresses=127.0.0.1"],
  onLog: () => {}, onError: () => {},
});
let prisma;
let started = false;
let passed = 0;

const ensurePortAvailable = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once("error", () => reject(new Error(`Integration-test port ${port} is busy. Stop that test process and retry.`)));
  server.listen(port, "127.0.0.1", () => server.close(resolve));
});
const applySchema = () => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [path.join(root, "node_modules/prisma/build/index.js"),
    "db", "push", "--skip-generate", "--schema", path.join(root, "server/prisma/schema.prisma")], {
    cwd: root, windowsHide: true,
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  child.once("error", reject);
  child.once("close", (code) => code === 0 ? resolve() : reject(new Error(`Could not initialize isolated schema: ${output.replaceAll(password, "[redacted]")}`)));
});
const response = () => ({ code: 200, body: null, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
const delivery = { firstName: "Integration", lastName: "Buyer", phone: "99112233", city: "UB", district: "Test", khoroo: "1", address: "Isolated test only" };

try {
  await ensurePortAvailable();
  console.log("Initializing a new isolated PostgreSQL test cluster...");
  await pg.initialise();
  await pg.start();
  started = true;
  await pg.createDatabase(database);
  await applySchema();
  process.env.DATABASE_URL = url;
  process.env.DIRECT_URL = url;
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_CHAT_ID;
  globalThis.fetch = async () => { throw new Error("External network forbidden in commerce integration tests"); };
  prisma = new PrismaClient({ datasources: { db: { url } } });
  globalThis.prisma = prisma;
  // Also block SMTP in case a developer has exported mail credentials.
  const { transporter } = await import("../server/utils/mailer.js");
  transporter.sendMail = async () => ({ accepted: [] });
  const { applyStockDecrements } = await import("../server/utils/stock.js");
  const { confirmPaidOrder } = await import("../server/utils/orderPaid.js");
  const { expireUnpaidOrders } = await import("../server/jobs/expireOrders.js");
  const { createFoodOrder } = await import("../server/controller/orders/create-orders.js");
  const { updatedFoodOrder } = await import("../server/controller/orders/update-orders.js");
  const { deleteFoodOrder } = await import("../server/controller/orders/delete-orders.js");
  const { backgroundSettled } = await import("../server/utils/background.js");
  const user = await prisma.user.create({ data: { email: "integration@example.invalid", isVerified: true } });
  const request = (body, id, role = "USER") => ({ body, params: { id }, user: { id: user.id, role } });
  const check = async (name, callback) => {
    await callback();
    await backgroundSettled();
    passed += 1;
    console.log(`PASS ${name}`);
  };
  const fixture = async ({ stock = 5 } = {}) => {
    await backgroundSettled();
    await prisma.$transaction([
      prisma.payment.deleteMany(), prisma.orderItem.deleteMany(), prisma.foodOrder.deleteMany(),
      prisma.foodSize.deleteMany(), prisma.food.deleteMany(),
    ]);
    return prisma.food.create({ data: {
      foodName: "Isolated integration product", price: 100, image: "/test-only.png", ingredients: "Test",
      sizes: { create: { label: "Small", stock } },
    } });
  };
  const reserveOrder = async ({ expired = false, quantity = 2, stock = 5 } = {}) => {
    const food = await fixture({ stock });
    const order = await prisma.$transaction(async (tx) => {
      await applyStockDecrements(tx, [{ foodId: food.id, size: "Small", quantity }]);
      return tx.foodOrder.create({ data: {
        userId: user.id, orderNumber: crypto.randomUUID(), totalPrice: quantity * 100,
        status: "WAITING_PAYMENT", paymentMethod: "QPAY",
        createdAt: new Date(Date.now() - (expired ? 20 * 60000 : 60000)),
        foodOrderItems: { create: { foodId: food.id, quantity, size: "Small" } },
      } });
    });
    const payment = await prisma.payment.create({ data: { orderId: order.id, invoiceId: crypto.randomUUID(), amount: order.totalPrice } });
    return { food, order, payment };
  };
  const inspect = async ({ food, order, payment }) => ({
    order: await prisma.foodOrder.findUnique({ where: { id: order.id } }),
    payment: await prisma.payment.findUnique({ where: { id: payment.id } }),
    food: await prisma.food.findUnique({ where: { id: food.id }, include: { sizes: true } }),
  });
  const confirm = (sample) => confirmPaidOrder({ orderId: sample.order.id, invoiceId: sample.payment.invoiceId });

  await check("concurrent checkouts cannot oversell real PostgreSQL variant stock", async () => {
    const food = await fixture({ stock: 5 });
    const replies = await Promise.all(Array.from({ length: 15 }, async (_, i) => {
      const res = response();
      await createFoodOrder(request({ ...delivery, paymentMethod: "BANK", idempotencyKey: `reservation-${i}`,
        items: [{ foodId: food.id, quantity: 1, size: "Small" }] }), res);
      return res;
    }));
    assert.equal(replies.filter((res) => res.code === 201).length, 5);
    assert.ok(replies.every((res) => [201, 409].includes(res.code)));
    assert.equal(await prisma.foodOrder.count(), 5);
    assert.equal((await prisma.foodSize.findFirst({ where: { foodId: food.id } })).stock, 0);
  });

  await check("concurrent duplicate checkout keys reserve stock once", async () => {
    const food = await fixture({ stock: 10 });
    const replies = await Promise.all(Array.from({ length: 12 }, async () => {
      const res = response();
      await createFoodOrder(request({ ...delivery, paymentMethod: "BANK", idempotencyKey: "same-checkout",
        items: [{ foodId: food.id, quantity: 2, size: "Small" }] }), res);
      return res;
    }));
    assert.equal(replies.filter((res) => res.code === 201).length, 1);
    assert.ok(replies.every((res) => [200, 201].includes(res.code)));
    assert.equal(new Set(replies.map((res) => res.body.orderId)).size, 1);
    assert.equal(await prisma.foodOrder.count(), 1);
    assert.equal((await prisma.foodSize.findFirst({ where: { foodId: food.id } })).stock, 8);
  });

  await check("simultaneous payment confirmation counts sales exactly once", async () => {
    const sample = await reserveOrder();
    const results = await Promise.all(Array.from({ length: 20 }, () => confirm(sample)));
    const actual = await inspect(sample);
    assert.equal(results.filter((result) => result.changed).length, 1);
    assert.equal(actual.order.status, "PAID"); assert.equal(actual.payment.status, "PAID");
    assert.equal(actual.food.salesCount, 2); assert.equal(actual.food.sizes[0].stock, 3);
  });

  await check("duplicate expiry workers release one reservation once", async () => {
    const sample = await reserveOrder({ expired: true });
    const results = await Promise.all(Array.from({ length: 10 }, () => expireUnpaidOrders(prisma)));
    assert.equal(results.reduce((sum, value) => sum + value, 0), 1);
    const actual = await inspect(sample);
    assert.equal(actual.order.status, "CANCELLED"); assert.equal(actual.food.sizes[0].stock, 5);
  });

  await check("expiry rechecks status after a stale candidate scan", async () => {
    const sample = await reserveOrder({ expired: true });
    const staleReader = {
      foodOrder: { findMany: async (args) => {
        const selected = await prisma.foodOrder.findMany(args);
        await confirm(sample);
        return selected;
      } },
      $transaction: prisma.$transaction.bind(prisma),
    };
    assert.equal(await expireUnpaidOrders(staleReader), 0);
    const actual = await inspect(sample);
    assert.equal(actual.order.status, "PAID"); assert.equal(actual.food.sizes[0].stock, 3);
  });

  await check("payment versus expiry races preserve receipt, inventory and sales invariants", async () => {
    for (let i = 0; i < 12; i += 1) {
      const sample = await reserveOrder({ expired: true });
      await Promise.all(i % 2 ? [confirm(sample), expireUnpaidOrders(prisma)] : [expireUnpaidOrders(prisma), confirm(sample)]);
      const actual = await inspect(sample);
      assert.equal(actual.payment.status, "PAID");
      assert.ok(["PAID", "CANCELLED"].includes(actual.order.status));
      assert.equal(actual.food.sizes[0].stock, actual.order.status === "PAID" ? 3 : 5);
      assert.equal(actual.food.salesCount, actual.order.status === "PAID" ? 2 : 0);
    }
  });

  await check("admin cancellation versus verified payment never revives released stock", async () => {
    for (let i = 0; i < 8; i += 1) {
      const sample = await reserveOrder();
      const res = response();
      await Promise.all([updatedFoodOrder(request({ status: "CANCELLED" }, sample.order.id, "ADMIN"), res), confirm(sample)]);
      assert.ok([200, 400, 409].includes(res.code));
      const actual = await inspect(sample);
      assert.equal(actual.payment.status, "PAID");
      assert.ok(["PAID", "CANCELLED"].includes(actual.order.status));
      assert.equal(actual.food.sizes[0].stock, actual.order.status === "PAID" ? 3 : 5);
      assert.equal(actual.food.salesCount, actual.order.status === "PAID" ? 2 : 0);
    }
  });

  await check("real transaction rolls back payment receipt when sales accounting fails", async () => {
    const sample = await reserveOrder();
    const brokenAccounting = { $transaction: (callback) => prisma.$transaction((tx) => callback({
      foodOrder: tx.foodOrder, payment: tx.payment, orderItem: tx.orderItem,
      food: { update: async () => { throw new Error("Injected sales write failure"); } },
    })) };
    await assert.rejects(confirmPaidOrder({ orderId: sample.order.id, invoiceId: sample.payment.invoiceId }, brokenAccounting), /Injected sales/);
    const actual = await inspect(sample);
    assert.equal(actual.order.status, "WAITING_PAYMENT"); assert.equal(actual.payment.status, "PENDING");
    assert.equal(actual.food.salesCount, 0);
  });

  await check("late verified funds retain a cancelled order and its payment history", async () => {
    const sample = await reserveOrder({ expired: true });
    assert.equal(await expireUnpaidOrders(prisma), 1);
    assert.equal((await confirm(sample)).requiresReview, true);
    const actual = await inspect(sample);
    assert.equal(actual.order.status, "CANCELLED"); assert.equal(actual.payment.status, "PAID");
    assert.equal(actual.food.sizes[0].stock, 5); assert.equal(actual.food.salesCount, 0);
    const res = response(); await deleteFoodOrder(request({ id: sample.order.id }, sample.order.id, "ADMIN"), res);
    assert.equal(res.code, 409); assert.ok(await prisma.foodOrder.findUnique({ where: { id: sample.order.id } }));
  });

  console.log(`Commerce integration: ${passed} checks passed against isolated PostgreSQL on 127.0.0.1:${port}.`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma?.$disconnect().catch(() => {});
  if (started) await pg.stop();
  // Verify the absolute target is the freshly generated test directory before
  // recursive deletion. The user's .local-db and environment URLs are unused.
  const resolved = path.resolve(directory);
  const prefix = path.resolve(temporaryPrefix);
  if (resolved.startsWith(prefix) && path.dirname(resolved) === path.resolve(os.tmpdir())) {
    await rm(resolved, { recursive: true, force: true });
  } else throw new Error("Refusing to remove an unexpected integration directory");
}
