import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
process.env.DATABASE_URL ||= "postgresql://test:test@localhost:5432/test";
const { verifyMetaSignature, parseMetaEvents, metaConfigured } = await import("../meta.js");

test("fake signed payloads for both Meta channels reject tampering and unsigned bodies", () => {
  for (const channel of ["messenger", "instagram"]) {
    const payload = { object: channel === "instagram" ? "instagram" : "page", entry: [{ id: "123", messaging: [{ sender: { id: "456" }, recipient: { id: "123" }, message: { mid: "fake-mid", text: "Hello" } }] }] };
    const raw = Buffer.from(JSON.stringify(payload));
    const signature = `sha256=${createHmac("sha256", "fake-secret").update(raw).digest("hex")}`;
    assert.ok(verifyMetaSignature(raw, signature, "fake-secret"));
    assert.equal(verifyMetaSignature(Buffer.concat([raw, Buffer.from(" ")]), signature, "fake-secret"), false);
    assert.equal(verifyMetaSignature(raw, undefined, "fake-secret"), false);
    assert.equal(verifyMetaSignature(raw, "sha256=a", "fake-secret"), false);
    const events = parseMetaEvents(payload, channel);
    assert.equal(events.length, 1);
    assert.equal(events[0].id, parseMetaEvents(payload, channel)[0].id);
    payload.entry[0].messaging[0].message.is_echo = true;
    assert.equal(parseMetaEvents(payload, channel).length, 0);
  }
});
test("Meta is disabled unless all three credentials are configured", () => {
  const before = { ...process.env };
  try {
    delete process.env.META_PAGE_ACCESS_TOKEN; delete process.env.META_APP_SECRET; delete process.env.META_VERIFY_TOKEN;
    assert.equal(metaConfigured(), false);
    process.env.META_PAGE_ACCESS_TOKEN = "fake-token";
    process.env.META_APP_SECRET = "fake-secret";
    assert.equal(metaConfigured(), false);
    process.env.META_VERIFY_TOKEN = "fake-verification";
    assert.equal(metaConfigured(), true);
  } finally {
    for (const key of ["META_PAGE_ACCESS_TOKEN", "META_APP_SECRET", "META_VERIFY_TOKEN"]) if (before[key] === undefined) delete process.env[key]; else process.env[key] = before[key];
  }
});
