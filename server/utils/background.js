// Work that should finish AFTER the response (Telegram alert, order email).
// On Vercel a function is frozen right after it responds, so fire-and-forget
// work gets lost. Register it here; the API adapter then keeps the function
// alive until everything registered has settled. Locally it is a harmless set.
const pending = new Set();

export function background(promise) {
  const p = Promise.resolve(promise).catch((err) => console.error("background task failed:", err?.message || err));
  pending.add(p);
  p.finally(() => pending.delete(p));
  return p;
}

/** Resolves when every registered background task has finished. */
export const backgroundSettled = () => Promise.allSettled([...pending]);
