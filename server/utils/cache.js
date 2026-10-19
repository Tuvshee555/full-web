// Tiny in-memory TTL cache for hot, read-only catalog endpoints (menu,
// categories). The menu changes rarely but is read on every page load, so
// serving it from memory for a few seconds removes almost all repeat DB
// round-trips — the main source of "the API feels a little slow" on a
// cross-region Neon/Render setup.
//
// Each process has its own copy; edits invalidate the current process only.
// Other instances may remain stale until their TTL expires.
const store = new Map();
const MAX_ENTRIES = 500;

/** Get a cached value or compute + store it. */
export async function cached(key, ttlMs, producer) {
  const hit = store.get(key);
  if (hit?.pending) return hit.pending;
  if (hit && Date.now() < hit.expires) return hit.value;
  if (!(ttlMs > 0)) return producer();

  // Coalesce concurrent misses so a burst of visitors causes one DB read.
  // Store the entry before invoking producer (which can throw synchronously).
  const entry = { expires: 0, value: undefined, pending: undefined };
  entry.pending = Promise.resolve().then(producer).then(
    (value) => {
      // An edit or eviction while this read was running must not refill the
      // cache with the old result or overwrite a newer in-flight read.
      if (store.get(key) === entry) {
        entry.value = value;
        entry.expires = Date.now() + ttlMs;
        entry.pending = undefined;
      }
      return value;
    },
    (error) => {
      if (store.get(key) === entry) store.delete(key);
      throw error;
    },
  );
  store.delete(key);
  if (store.size >= MAX_ENTRIES) {
    for (const [storedKey, stored] of store) {
      if (!stored.pending && stored.expires <= Date.now()) store.delete(storedKey);
    }
    if (store.size >= MAX_ENTRIES) store.delete(store.keys().next().value);
  }
  store.set(key, entry);
  return entry.pending;
}

/** Drop every entry whose key starts with `prefix`. */
export function invalidate(prefix) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

/** Clear all cached catalog reads — call after any product/category mutation. */
export function invalidateCatalog() {
  invalidate("products");
  invalidate("categories");
}
