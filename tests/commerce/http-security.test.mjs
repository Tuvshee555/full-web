import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { once } from "node:events";

test("API health, JSON errors, token types and login throttling work over HTTP without a database", async () => {
  process.env.FRONTEND_URL = "https://shop.example.test";
  const { default: app } = await import("../../server/app.js");
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const health = await fetch(`${origin}/health`, { headers: { Origin: "https://shop.example.test" } });
    assert.equal(health.status, 200);
    assert.equal(health.headers.get("cache-control"), "no-store");
    assert.equal(health.headers.get("access-control-allow-origin"), "https://shop.example.test");
    assert.equal(health.headers.has("x-powered-by"), false);
    const deniedOrigin = await fetch(`${origin}/health`, { headers: { Origin: "https://evil.example.test" } });
    assert.equal(deniedOrigin.headers.has("access-control-allow-origin"), false);
    const badJson = await fetch(`${origin}/user/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{broken" });
    assert.equal(badJson.status, 400);
    assert.equal(badJson.headers.get("cache-control"), "no-store");
    for (const path of ["/products", "/food"]) {
      const response = await fetch(`${origin}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      assert.equal(response.status, 401);
    }
    for (const token of [null, "invalid-token", jwt.sign({ id: "test-only", type: "reset" }, process.env.JWT_SECRET)]) {
      const res = await fetch(`${origin}/order`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      assert.equal(res.status, 401);
    }
    for (let i = 0; i < 20; i++) {
      const res = await fetch(`${origin}/user/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "invalid" }) });
      assert.equal(res.status, 400);
    }
    const limited = await fetch(`${origin}/user/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "invalid" }) });
    assert.equal(limited.status, 429);
    assert.ok(limited.headers.has("ratelimit-limit"));
  } finally { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); }
});
