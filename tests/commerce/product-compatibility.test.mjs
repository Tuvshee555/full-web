import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { once } from "node:events";
import { catalogCompatibility } from "../../server/middleware/catalogCompatibility.js";

test("previous catalog URLs and checkout bodies reach product handlers without bypassing auth", async () => {
  const app = express();
  app.use(express.json());
  app.use(catalogCompatibility);
  const product = { id: "one", productName: "Brow serum", createdAt: new Date("2026-10-19T00:00:00Z") };
  app.get("/products", (req, res) => res.json([product]));
  app.post("/products", (req, res) => res.sendStatus(401));
  app.get("/category/:id/products-tree", (req, res) => res.json({ products: [product], productCount: 1 }));
  app.get("/review/products/:productId", (req, res) => res.json({ productId: req.params.productId, page: req.query.page }));
  app.post("/order", (req, res) => res.json({ orderItems: req.body.items }));
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const current = await (await fetch(`${origin}/products`)).json();
    assert.equal(current[0].productName, "Brow serum");
    assert.equal("foodName" in current[0], false);
    assert.equal(current[0].createdAt, "2026-10-19T00:00:00.000Z");
    const previous = await (await fetch(`${origin}/food`)).json();
    assert.equal(previous[0].foodName, "Brow serum");
    assert.equal(previous[0].productName, "Brow serum");
    assert.equal(previous[0].createdAt, current[0].createdAt);
    assert.equal((await fetch(`${origin}/food`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).status, 401);
    const category = await (await fetch(`${origin}/category/brows/foods-tree`)).json();
    assert.equal(category.products[0].id, "one");
    assert.deepEqual(category.foods, category.products);
    assert.equal(category.foodCount, 1);
    for (const path of ["/category/brows/foods-tree/", "/CATEGORY/brows/FOODS-TREE/?page=2"]) {
      const response = await fetch(`${origin}${path}`);
      assert.equal(response.status, 200);
      assert.equal((await response.json()).foods[0].foodName, "Brow serum");
    }
    assert.equal((await (await fetch(`${origin}/FOOD/`)).json())[0].foodName, "Brow serum");
    const review = await (await fetch(`${origin}/review/food/one?page=2`)).json();
    assert.equal(review.productId, "one");
    assert.equal(review.foodId, "one");
    assert.equal(review.page, "2");
    const order = await (await fetch(`${origin}/order`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ foodId: "previous", productId: "canonical", quantity: 2, size: "Small" }] }),
    })).json();
    assert.equal(order.orderItems[0].productId, "canonical");
    assert.equal(order.orderItems[0].foodId, "canonical");
    assert.equal(order.orderItems[0].quantity, 2);
    assert.equal(order.orderItems[0].size, "Small");
    assert.deepEqual(order.foodOrderItems, order.orderItems);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("previous product-page bookmarks redirect to the canonical product URL", async () => {
  const { default: config } = await import("../../next.config.mjs");
  assert.ok((await config.redirects()).some((rule) =>
    rule.source === "/:locale/food/:id" && rule.destination === "/:locale/products/:id" && rule.permanent === true));
});
