import assert from "node:assert/strict";
import test from "node:test";
import http from "node:http";
import express from "express";
import { cached, invalidate } from "../../server/utils/cache.js";
import { publicCache } from "../../server/middleware/publicCache.js";

test("100 concurrent catalog reads make one producer call", async () => {
  invalidate("test:");
  let calls = 0;
  const requests = Array.from({ length: 100 }, () => cached("test:burst", 60_000, async () => {
    calls += 1;
    await Promise.resolve();
    return { products: ["one"] };
  }));
  const values = await Promise.all(requests);
  assert.equal(calls, 1);
  assert.ok(values.every((value) => value === values[0]));
});

test("an in-flight read cannot repopulate invalidated catalog data", async () => {
  let finish;
  const old = cached("test:race", 60_000, () => new Promise((resolve) => { finish = resolve; }));
  await Promise.resolve();
  invalidate("test:race");
  assert.equal(await cached("test:race", 60_000, () => "new"), "new");
  finish("old");
  assert.equal(await old, "old");
  assert.equal(await cached("test:race", 60_000, () => "unexpected"), "new");
});

test("failed and expired producers can be retried", async () => {
  await assert.rejects(cached("test:failure", 100, () => { throw new Error("DB unavailable"); }), /DB unavailable/);
  assert.equal(await cached("test:failure", 100, () => "recovered"), "recovered");
  const originalNow = Date.now;
  try {
    let now = originalNow();
    Date.now = () => now;
    assert.equal(await cached("test:expiry", 100, () => "first"), "first");
    now += 101;
    assert.equal(await cached("test:expiry", 100, () => "second"), "second");
  } finally { Date.now = originalNow; }
});

test("untrusted catalog keys cannot grow the cache without bound", async () => {
  invalidate("");
  await cached("test:oldest", 60_000, () => "old");
  for (let i = 0; i < 501; i += 1) await cached(`test:bounded:${i}`, 60_000, () => i);
  assert.equal(await cached("test:oldest", 60_000, () => "reloaded"), "reloaded");
});

test("only successful public responses receive public cache headers", async () => {
  const app = express();
  app.use(publicCache());
  app.get("/ok", (_req, res) => res.json({ ok: true }));
  app.get("/error", (_req, res) => res.status(503).json({ message: "try later" }));
  app.get("/missing", (_req, res) => res.status(404).json({ message: "missing" }));
  app.get("/private", (req, res) => { req.user = { role: "ADMIN" }; res.json({ stock: 42 }); });
  app.get("/cookie", (_req, res) => { res.cookie("session", "test"); res.json({ ok: true }); });
  app.get("/explicit", (_req, res) => { res.set("Cache-Control", "no-store"); res.json({ ok: true }); });
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const url = `http://127.0.0.1:${server.address().port}`;
    assert.equal((await fetch(`${url}/ok`)).headers.get("cache-control"), "public, max-age=15, stale-while-revalidate=30");
    for (const path of ["error", "missing", "private", "cookie"]) {
      assert.equal((await fetch(`${url}/${path}`)).headers.get("cache-control"), "private, no-store", path);
    }
    assert.equal((await fetch(`${url}/explicit`)).headers.get("cache-control"), "no-store");
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
