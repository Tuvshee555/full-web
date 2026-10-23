// Opt-in regression test: runs migration history and the product rename against
// a fresh temporary PostgreSQL cluster. No .env files or application DB are used.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import EmbeddedPostgres from "embedded-postgres";
import { PrismaClient } from "@prisma/client";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrations = path.join(root, "server/prisma/migrations");
const rename = "20261019010000_product_terminology";
const temporaryPrefix = path.join(os.tmpdir(), "eyebrow-product-migration-");
const directory = await mkdtemp(temporaryPrefix);
const password = crypto.randomBytes(16).toString("hex");
const database = "product_migration_regression";
const port = await new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const selected = server.address().port;
    server.close((error) => error ? reject(error) : resolve(selected));
  });
});
const url = `postgresql://postgres:${password}@127.0.0.1:${port}/${database}?sslmode=disable`;
const pg = new EmbeddedPostgres({
  databaseDir: path.join(directory, "postgres"), port, user: "postgres", password,
  persistent: true,
  initdbFlags: ["--encoding=UTF8", "--locale=C", "--no-sync"],
  // io_method=sync: no PostgreSQL 18 io_worker processes, which outlive stop() on Windows.
  postgresFlags: ["-c", "listen_addresses=127.0.0.1", "-c", "io_method=sync"],
  onLog: () => {}, onError: () => {},
});
let started = false;
let client;
let prisma;

const snapshot = async () => ({
  columns: (await client.query(`SELECT table_name, column_name, data_type,
    udt_name, is_nullable, column_default FROM information_schema.columns
    WHERE table_schema = 'public' ORDER BY table_name, ordinal_position`)).rows,
  indexes: (await client.query(`SELECT tablename, indexname, indexdef
    FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname`)).rows,
  constraints: (await client.query(`SELECT rel.relname AS table_name, con.conname,
    con.contype, pg_get_constraintdef(con.oid) AS definition FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE ns.nspname = 'public' ORDER BY rel.relname, con.conname`)).rows,
});
const normalize = (value) => JSON.parse(JSON.stringify(value)
  .replaceAll("FoodOrder", "Order").replaceAll("FoodSize", "ProductSize")
  .replaceAll("Food", "Product").replaceAll("foodName", "productName")
  .replaceAll("foodId", "productId"));
const sorted = (rows) => rows.map((row) => JSON.stringify(row)).sort();

try {
  console.log("Initializing isolated PostgreSQL for the product rename regression...");
  await pg.initialise();
  await pg.start();
  started = true;
  await pg.createDatabase(database);
  client = pg.getPgClient(database, "127.0.0.1");
  await client.connect();
  const history = (await readdir(migrations, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && entry.name < rename)
    .map((entry) => entry.name).sort();
  for (const migration of history) {
    await client.query(await readFile(path.join(migrations, migration, "migration.sql"), "utf8"));
  }

  // Seed the legacy physical names, including every relationship to a product
  // or order, so a table recreation or disconnected relation loses the fixture.
  await client.query(`
    INSERT INTO "User" (id, email, "updatedAt")
      VALUES ('rename-user', 'rename@example.invalid', CURRENT_TIMESTAMP);
    INSERT INTO "Category" (id, "categoryName") VALUES ('rename-category', 'Migration fixture');
    INSERT INTO "Food" (id, "foodName", price, image, ingredients, "categoryId")
      VALUES ('rename-product', 'Retained catalog item', 100, '/fixture.png', 'Fixture', 'rename-category');
    INSERT INTO "FoodSize" (id, "foodId", label, stock, price)
      VALUES ('rename-size', 'rename-product', 'Large', 7, 125);
    INSERT INTO "FoodOrder" (id, "orderNumber", "idempotencyKey", "userId", "totalPrice", status, "paymentMethod", "updatedAt")
      VALUES ('rename-order', 'RENAME-1', 'rename-checkout', 'rename-user', 250, 'PAID', 'LEMON', CURRENT_TIMESTAMP);
    INSERT INTO "OrderItem" (id, "foodId", quantity, size, "unitPrice", "orderId", "userId")
      VALUES ('rename-line', 'rename-product', 2, 'Large', 125, 'rename-order', 'rename-user');
    INSERT INTO "Review" (id, "foodId", "userId", rating, comment, "updatedAt")
      VALUES ('rename-review', 'rename-product', 'rename-user', 5, 'Retained review', CURRENT_TIMESTAMP);
    INSERT INTO "Payment" (id, "invoiceId", "orderId", amount, "updatedAt")
      VALUES ('rename-payment', 'rename-invoice', 'rename-order', 250, CURRENT_TIMESTAMP);
    INSERT INTO "LemonPayment" (id, "orderId", amount, "updatedAt")
      VALUES ('rename-lemon', 'rename-order', 250, CURRENT_TIMESTAMP);
  `);
  const before = await snapshot();
  await client.query(await readFile(path.join(migrations, rename, "migration.sql"), "utf8"));
  const after = await snapshot();
  for (const type of ["columns", "indexes", "constraints"]) {
    assert.deepEqual(sorted(after[type]), sorted(normalize(before[type])),
      `The rename must retain all ${type} and their definitions`);
  }
  assert.doesNotMatch(JSON.stringify(after), /Food|foodId|foodName/);
  console.log("PASS migration history applies; all columns, defaults, constraints and indexes are retained with product names");

  prisma = new PrismaClient({ datasources: { db: { url } } });
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: "rename-product" }, include: { category: true, sizes: true, reviews: true, OrderItem: true },
  });
  assert.equal(product.productName, "Retained catalog item");
  assert.equal(product.category.categoryName, "Migration fixture");
  assert.equal(product.sizes[0].stock, 7);
  assert.equal(product.sizes[0].price, 125);
  assert.equal(product.reviews[0].comment, "Retained review");
  assert.equal(product.OrderItem[0].unitPrice, 125);
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: "rename-order" }, include: { user: true, orderItems: { include: { product: true } }, lemonPayments: true },
  });
  assert.equal(order.totalPrice, 250);
  assert.equal(order.orderItems[0].product.productName, product.productName);
  assert.equal(order.user.email, "rename@example.invalid");
  assert.equal(order.lemonPayments[0].amount, 250);
  assert.equal((await prisma.payment.findUniqueOrThrow({ where: { orderId: order.id } })).amount, 250);
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: order.userId }, include: { Order: true, orderedProducts: true },
  });
  assert.equal(user.Order[0].id, order.id);
  assert.equal(user.orderedProducts[0].productId, product.id);
  console.log("PASS existing products, variants, orders, payments and reviews load through the renamed Prisma relations");

  const created = await prisma.product.create({ data: {
    productName: "New catalog item", price: 50, image: "/new.png", ingredients: "New fixture",
    sizes: { create: { label: "Standard", stock: 3 } },
  }, include: { sizes: true } });
  assert.equal(created.salesCount, 0);
  assert.equal(created.avgRating, 0);
  assert.equal(created.reviewCount, 0);
  assert.equal(created.isFeatured, false);
  assert.equal(created.sizes[0].price, null);
  await assert.rejects(prisma.review.create({ data: {
    productId: product.id, userId: order.userId, rating: 4, comment: "Duplicate rejected",
  } }), (error) => error.code === "P2002");
  await assert.rejects(prisma.productSize.create({ data: {
    productId: "missing-product", label: "Invalid",
  } }), (error) => error.code === "P2003");
  const review = await prisma.review.create({ data: {
    productId: created.id, userId: order.userId, rating: 5, comment: "Cascade fixture",
  } });
  await prisma.productSize.deleteMany({ where: { productId: created.id } });
  await prisma.product.delete({ where: { id: created.id } });
  assert.equal(await prisma.review.findUnique({ where: { id: review.id } }), null);
  console.log("PASS new Prisma writes retain defaults, unique keys, foreign keys and review cascades");
  console.log("Product migration: 3 checks passed against an isolated temporary PostgreSQL cluster.");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma?.$disconnect().catch(() => {});
  await client?.end().catch(() => {});
  if (started) await pg.stop();
  const resolved = path.resolve(directory);
  if (resolved.startsWith(path.resolve(temporaryPrefix)) && path.dirname(resolved) === path.resolve(os.tmpdir())) {
    // On Windows, postgres worker processes release their files a moment after stop().
    await rm(resolved, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
  } else throw new Error("Refusing to remove an unexpected migration-test directory");
}

// embedded-postgres installs a beforeExit hook that exits with zero; preserve
// assertion failures after all database cleanup has finished.
process.exit(process.exitCode ?? 0);
