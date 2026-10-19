import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { normalizeEmail, validPassword } from "../../server/utils/authValidation.js";
import { createRoleResolver } from "../../server/utils/userRole.js";
import { checkOtp } from "../../server/utils/otp-store.js";
import { requireAuth } from "../../server/middleware/requireAuth.js";
import { safeReturnPath } from "../../src/utils/safeRedirect.ts";
import { resetPassword } from "../../server/controller/users/reset-password.js";
import { prisma } from "../../server/prismaClient.js";
import { createHash } from "node:crypto";

const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

test("email/password validation rejects malformed types and bcrypt truncation", () => {
  assert.equal(normalizeEmail("  SHOP@Example.com "), "shop@example.com");
  for (const bad of [null, {}, ["a@b.com"], "a@b", "a b@c.com", "a".repeat(260) + "@b.com"]) assert.equal(normalizeEmail(bad), null);
  assert.equal(validPassword("password123"), true);
  assert.equal(validPassword("1234567"), false);
  assert.equal(validPassword("a".repeat(73)), false);
  assert.equal(validPassword("ү".repeat(37)), false);
});

test("login return paths cannot execute scripts or escape to another origin", () => {
  for (const bad of ["javascript:alert(1)", "//evil.test", "/\\evil.test", "/%5cevil.test", "/%2fevil.test", "/%0aevil", "https://evil.test", "/%broken"]) assert.equal(safeReturnPath(bad), "/mn");
  assert.equal(safeReturnPath("/en/checkout?orderId=123"), "/en/checkout?orderId=123");
});

test("authorization bursts share one role lookup and expiry observes revocation", async () => {
  let calls = 0; let now = 100; let role = "ADMIN";
  const resolve = createRoleResolver(async () => { calls++; await new Promise((r) => setTimeout(r, 5)); return role; }, { now: () => now, ttlMs: 10, maxEntries: 2 });
  assert.deepEqual(await Promise.all(Array.from({ length: 40 }, () => resolve("one"))), Array(40).fill("ADMIN"));
  assert.equal(calls, 1);
  role = "USER"; now = 111;
  assert.equal(await resolve("one"), "USER");
  await resolve("two"); await resolve("three"); await resolve("one");
  assert.equal(calls, 5); // first entry was evicted instead of growing forever
});

test("failed role checks are retryable instead of caching authorization failures", async () => {
  let fail = true;
  const resolve = createRoleResolver(async () => { if (fail) throw Error("offline"); return "ADMIN"; });
  await assert.rejects(resolve("id")); fail = false;
  assert.equal(await resolve("id"), "ADMIN");
});

test("reset tokens and malformed user claims cannot authenticate API requests", async () => {
  const secret = process.env.JWT_SECRET;
  for (const claims of [{ id: "user", type: "reset" }, { id: { injected: true }, type: "access" }, { type: "access" }]) {
    const res = response(); let next = false;
    await requireAuth({ headers: { authorization: `Bearer ${jwt.sign(claims, secret)}` } }, res, () => { next = true; });
    assert.equal(res.statusCode, 401); assert.equal(next, false);
  }
});

async function otpDatabase() {
  const state = { record: { id: "otp", email: "shop@example.test", codeHash: await bcrypt.hash("123456", 4), attempts: 0, expiresAt: new Date(Date.now() + 60000) } };
  const matches = (where) => {
    const r = state.record;
    return r && r.id === where.id && r.codeHash === where.codeHash && (!where.attempts || r.attempts < where.attempts.lt) && (!where.expiresAt?.gt || r.expiresAt > where.expiresAt.gt);
  };
  return { state, db: { emailOtp: {
    findUnique: async () => state.record && { ...state.record },
    updateMany: async ({ where }) => { if (!matches(where)) return { count: 0 }; state.record.attempts++; return { count: 1 }; },
    deleteMany: async ({ where }) => { if (!matches(where)) return { count: 0 }; state.record = null; return { count: 1 }; },
  } } };
}

test("parallel correct OTP submissions authenticate exactly once", async () => {
  const { db } = await otpDatabase();
  const results = await Promise.all(Array.from({ length: 4 }, () => checkOtp("shop@example.test", "123456", db)));
  assert.equal(results.filter((r) => r.ok).length, 1);
});

test("parallel OTP guesses cannot exceed the attempt budget", async () => {
  const { db, state } = await otpDatabase();
  await Promise.all(Array.from({ length: 20 }, () => checkOtp("shop@example.test", "999999", db)));
  assert.equal(state.record.attempts, 5);
  assert.deepEqual(await checkOtp("shop@example.test", "123456", db), { ok: false, reason: "locked" });
});

test("parallel password reset submissions consume the reset link exactly once", async () => {
  const token = jwt.sign({ id: "reset-test-user", type: "reset" }, process.env.JWT_SECRET, { expiresIn: "15m" });
  let saved = { id: "reset-test-user", resetToken: createHash("sha256").update(token).digest("hex"), resetTokenExpiry: new Date(Date.now() + 60000) };
  const previousFind = prisma.user.findUnique;
  const previousUpdate = prisma.user.updateMany;
  prisma.user.findUnique = async () => ({ ...saved });
  prisma.user.updateMany = async ({ where, data }) => {
    if (!saved.resetToken || where.resetToken !== saved.resetToken) return { count: 0 };
    saved = { ...saved, ...data }; return { count: 1 };
  };
  try {
    const responses = [response(), response(), response()];
    await Promise.all(responses.map((res) => resetPassword({ body: { token, newPassword: "new-password-123" } }, res)));
    assert.equal(responses.filter((res) => res.statusCode === 200).length, 1);
    assert.equal(saved.resetToken, null);
  } finally { prisma.user.findUnique = previousFind; prisma.user.updateMany = previousUpdate; }
});
