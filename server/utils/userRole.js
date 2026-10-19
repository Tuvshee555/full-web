import { prisma } from "../prismaClient.js";

/** Bound memory use and coalesce bursts of authorization checks for one account. */
export function createRoleResolver(loadRole, { ttlMs = 15_000, maxEntries = 1000, now = Date.now } = {}) {
  const cache = new Map();
  return async function resolveRole(userId) {
    const hit = cache.get(userId);
    if (hit && (hit.pending || hit.expires > now())) return hit.pending ?? hit.role;
    if (cache.size >= maxEntries) cache.delete(cache.keys().next().value);
    const entry = { pending: null, role: null, expires: 0 };
    const pending = Promise.resolve().then(() => loadRole(userId)).then((role) => {
      entry.pending = null;
      entry.role = role;
      entry.expires = now() + ttlMs;
      return role;
    }).catch((error) => {
      if (cache.get(userId) === entry) cache.delete(userId);
      throw error;
    });
    entry.pending = pending;
    cache.set(userId, entry);
    return pending;
  };
}

export const resolveUserRole = createRoleResolver(async (id) => {
  const user = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  return user?.role ?? null;
});
