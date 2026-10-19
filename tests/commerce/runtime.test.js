import test from "node:test";
import assert from "node:assert/strict";
import { corsOptions } from "../../server/utils/corsOptions.js";
import { uploadMediaFiles } from "../../server/utils/mediaUpload.js";

test("CORS only permits configured business origins and local development", () => {
  const options = corsOptions({ FRONTEND_URL: "https://shop.example/path", ADMIN_URL: "https://admin.example/admin", CORS_ALLOWED_ORIGINS: "https://other.example, broken, javascript:evil" });
  const allowed = (origin) => { let value; options.origin(origin, (_error, ok) => { value = ok; }); return value; };
  for (const origin of [undefined, "http://localhost:3000", "https://shop.example", "https://admin.example", "https://other.example"]) assert.equal(allowed(origin), true);
  for (const origin of ["https://shop.example.evil", "https://unknown.example", "null", "javascript:evil"]) assert.equal(allowed(origin), false);
});

test("media uploads bound parallel work and clean all temp files on failure", async () => {
  let active = 0; let maximum = 0; const removed = [];
  await assert.rejects(uploadMediaFiles([0, 1, 2, 3, 4, 5], async (id) => {
    active++; maximum = Math.max(maximum, active);
    await new Promise((r) => setTimeout(r, 2)); active--;
    if (id === 2) throw Error("provider offline"); return `url-${id}`;
  }, async (id) => { removed.push(id); }), /provider offline/);
  assert.equal(maximum, 2);
  assert.deepEqual(removed.sort(), [0, 1, 2, 3, 4, 5]);
});

test("media upload responses preserve input order when workers finish out of order", async () => {
  assert.deepEqual(await uploadMediaFiles([10, 1, 5], async (delay) => { await new Promise((r) => setTimeout(r, delay)); return delay; }, async () => {}), [10, 1, 5]);
});
