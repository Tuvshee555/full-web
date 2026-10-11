import { expireUnpaidOrders } from "../jobs/expireOrders.js";
import { cleanupGuestUsers } from "../jobs/cleanupGuests.js";

// Serverless functions have no long-lived timers, so server.mjs's setInterval
// jobs never run on Vercel. These run the same jobs on demand instead, at most
// once per window per warm instance, whenever someone uses the API:
//   - unpaid orders older than 15 min are cancelled and their stock released
//   - stale guest accounts are cleaned up
// (Plain Vercel Hobby cron only runs once a day, far too slow for 15 minutes.)
const EXPIRE_EVERY_MS = 60 * 1000;
const CLEANUP_EVERY_MS = 6 * 60 * 60 * 1000;
let lastExpire = 0;
let lastCleanup = 0;

export async function runDueJobs() {
  const now = Date.now();
  const tasks = [];
  if (now - lastExpire > EXPIRE_EVERY_MS) {
    lastExpire = now;
    tasks.push(expireUnpaidOrders());
  }
  if (now - lastCleanup > CLEANUP_EVERY_MS) {
    lastCleanup = now;
    tasks.push(cleanupGuestUsers());
  }
  // Never let a job problem break the request that happened to trigger it.
  await Promise.allSettled(tasks);
}
