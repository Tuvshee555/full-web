import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "../../server/middleware/requireAdmin.js";
import { getClientKey, rateLimitAsync } from "./rateLimit";
import { recordCounter } from "./observability";

export async function requireAdminAccess(
  req: NextApiRequest,
  res: NextApiResponse,
  route: string,
) {
  const clientKey = getClientKey(req);
  const limit = await rateLimitAsync(
    `admin-auth:${clientKey}`,
    120,
    60 * 1000,
  );
  if (!limit.allowed) {
    recordCounter("abuse.admin_auth_blocked_total", 1, { route });
    res.status(429).json({ error: "too_many_attempts", reset: limit.reset });
    return false;
  }

  // Reuse the store's JWT verifier and database role check. Neither copied
  // shared-secret credentials nor open-access flags can unlock this admin.
  return new Promise<boolean>((resolve) => {
    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => { resolve(false); return originalJson(body); }) as typeof res.json;
    requireAdmin(req, res, () => { res.json = originalJson; resolve(true); });
  });
}
