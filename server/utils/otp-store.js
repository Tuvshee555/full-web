import bcrypt from "bcryptjs";
import { prisma } from "../prismaClient.js";

// Persistent, brute-force-resistant email OTP store.
// Replaces the previous in-memory Map, which silently broke across
// serverless / multi-instance deployments (code set on one instance was
// never visible on another).

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
export const OTP_MAX_ATTEMPTS = 5; // lock the code after this many wrong guesses

/**
 * Store a freshly generated OTP for an email (hashed, single active code).
 */
export async function saveOtp(email, code, db = prisma) {
  const codeHash = await bcrypt.hash(String(code), 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await db.emailOtp.upsert({
    where: { email },
    update: { codeHash, expiresAt, attempts: 0 },
    create: { email, codeHash, expiresAt, attempts: 0 },
  });
}

/**
 * Verify an OTP. Consumes the code on success, increments the attempt
 * counter on failure, and locks the code after OTP_MAX_ATTEMPTS.
 *
 * @returns {Promise<{ ok: boolean, reason?: "not_found"|"expired"|"locked"|"mismatch" }>}
 */
export async function checkOtp(email, code, db = prisma) {
  const record = await db.emailOtp.findUnique({ where: { email } });

  if (!record) return { ok: false, reason: "not_found" };

  if (Date.now() > new Date(record.expiresAt).getTime()) {
    await db.emailOtp.deleteMany({ where: { id: record.id, codeHash: record.codeHash, expiresAt: { lte: new Date() } } });
    return { ok: false, reason: "expired" };
  }

  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    return { ok: false, reason: "locked" };
  }

  // Reserve the attempt atomically before expensive bcrypt work. Parallel
  // requests cannot all read the same counter and bypass the per-code limit.
  const claim = await db.emailOtp.updateMany({
    where: { id: record.id, codeHash: record.codeHash, expiresAt: { gt: new Date() }, attempts: { lt: OTP_MAX_ATTEMPTS } },
    data: { attempts: { increment: 1 } },
  });
  if (!claim.count) return { ok: false, reason: "locked" };

  const matches = await bcrypt.compare(String(code), record.codeHash);

  if (!matches) {
    return { ok: false, reason: "mismatch" };
  }

  // Only the request that consumes this exact version may authenticate. A
  // concurrent successful verification or replacement code must not be reused.
  const consumed = await db.emailOtp.deleteMany({ where: { id: record.id, codeHash: record.codeHash, expiresAt: { gt: new Date() } } });
  return consumed.count === 1 ? { ok: true } : { ok: false, reason: "not_found" };
}
