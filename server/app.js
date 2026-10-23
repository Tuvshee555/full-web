// Express API app. It is mounted at /api by the combined server (../server.mjs)
// and can also run on its own via ./index.js. Both runners load the .env files
// before importing this module, because routers create the Prisma client at
// import time.
import express from "express";
import cors from "cors";
import { userRouter } from "./routers/user.router.js";
import { productRouter } from "./routers/product.router.js";
import { categoryRouter } from "./routers/category.router.js";
import { items } from "./routers/items.router.js";
import { qpayRouter } from "./routers/qpay.router.js";
import { orderRouter } from "./routers/order.router.js";
import { statRouter } from "./routers/stat.router.js";
import { emailRouter } from "./routers/email.routes.js";
import uploadRouter from "./routers/upload.router.js";
import { expireUnpaidOrders } from "./jobs/expireOrders.js";
import { cleanupGuestUsers } from "./jobs/cleanupGuests.js";
import { reviewRouter } from "./routers/review.router.js";
import { connectPrismaWithRetry } from "./utils/prisma.js";
import { corsOptions } from "./utils/corsOptions.js";
import { catalogCompatibility } from "./middleware/catalogCompatibility.js";

// Optional hardening/perf middleware, loaded defensively so the server still
// boots if the deps aren't installed yet (run `npm install` to enable them).
let compression = null;
let helmet = null;
try {
  ({ default: compression } = await import("compression"));
} catch {
  console.warn("compression not installed — run `npm install` to enable gzip.");
}
try {
  ({ default: helmet } = await import("helmet"));
} catch {
  console.warn("helmet not installed — run `npm install` to enable security headers.");
}

const app = express();
// Behind Vercel (or any proxy): use the real client IP for rate limiting.
const trustProxy = process.env.TRUST_PROXY || (process.env.VERCEL ? "1" : "loopback");
app.set("trust proxy", /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy);
app.disable("x-powered-by");

if (helmet) {
  // JSON API consumed cross-origin by the storefront/admin: keep the safe
  // headers but disable the policies that would block those cross-origin apps.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );
}

if (compression) {
  app.use(compression());
}

if (!process.env.JWT_SECRET) {
  console.error("Missing JWT_SECRET. Set it in your environment.");
  process.exit(1);
}

app.use(cors(corsOptions()));
app.use((req, res, next) => {
  if (req.headers.authorization || !["GET", "HEAD"].includes(req.method)) res.set("Cache-Control", "no-store");
  next();
});

app.use(express.json({
  limit: "4mb",
  verify: (req, res, buf) => {
    req.rawBody = buf;
  },
}));

app.use(express.urlencoded({ extended: true }));
app.use(catalogCompatibility);

app.get("/", (_, res) => {
  res.json({ status: "ok" });
});
app.get("/health", (_, res) => res.set("Cache-Control", "no-store").json({ status: "ok" }));
app.get("/ready", async (_, res) => {
  res.set("Cache-Control", "no-store");
  try {
    const { prisma } = await import("./prismaClient.js");
    // Read one full row from every table a sale touches. A bare SELECT 1 kept
    // saying "ready" for 4 days while code and schema disagreed (2026-10-19).
    await Promise.all([
      prisma.product.findFirst(), prisma.productSize.findFirst(), prisma.category.findFirst(),
      prisma.order.findFirst(), prisma.orderItem.findFirst(), prisma.payment.findFirst(),
    ]);
    return res.json({ status: "ready" });
  } catch (error) {
    console.error("Readiness check failed:", error?.code || error?.message);
    return res.status(503).json({ status: "unavailable" });
  }
});

app.use("/products", productRouter);
app.use("/order", orderRouter);
app.use("/user", userRouter);
app.use("/category", categoryRouter);
app.use("/items", items);
app.use("/qpay", qpayRouter);
app.use("/stats", statRouter);
app.use("/email", emailRouter);
app.use("/upload", uploadRouter);
app.use("/review", reviewRouter);
// Preserve cached widget URLs while every channel uses the ported Pages engine.
app.use("/chat/webhooks", (req, res) => res.redirect(308, "/api/chatbot/webhook"));
app.use("/chat", (req, res) => res.redirect(308, `/api/chatbot/public${req.url}`));
app.use("/admin/chat", (req, res) => res.redirect(308, `/api/chatbot/admin${req.url}`));

// Express recognises error middleware by its four parameters, so `_next` must stay.
app.use((err, req, res, _next) => {
  if (res.headersSent) return _next(err);
  res.set("Cache-Control", "no-store");
  if (err.type === "entity.parse.failed") return res.status(400).json({ message: "Invalid JSON request" });
  if (err.status === 413 || err.code === "LIMIT_FILE_SIZE") return res.status(413).json({ message: "Upload or request is too large" });
  if (err.code?.startsWith("LIMIT_")) return res.status(400).json({ message: "Invalid upload request" });
  if (err.status === 415) return res.status(415).json({ message: "Unsupported file type" });
  if (/^\/(?:chat|admin\/chat)(?:\/|$)/.test(req.url)) {
    console.error(JSON.stringify({ scope: "chatbot", code: "INVALID_REQUEST" }));
    return res.status(err.status === 413 ? 413 : 400).json({ code: "INVALID_REQUEST" });
  }
  console.error("GLOBAL ERROR:", err);
  res.status(500).json({ message: "Internal server error" });
});

// Connects to Postgres and starts the background jobs. Exits the process if
// the database is unreachable, so neither runner serves a half-working API.
export const startBackend = async () => {
  try {
    await connectPrismaWithRetry();
    console.log("Database connected");
  } catch (error) {
    console.error("Failed to connect to PostgreSQL.");
    console.error(
      "Check DATABASE_URL in .env and make sure it matches your current PostgreSQL provider."
    );
    console.error(
      "If you are using Neon or another hosted Postgres provider, verify the host, password, database name, and SSL settings."
    );
    console.error("Startup error:", error.message);
    process.exit(1);
  }

  setInterval(expireUnpaidOrders, 5 * 60 * 1000);

  // Purge stale guest accounts once a day (and shortly after boot).
  setTimeout(cleanupGuestUsers, 60 * 1000);
  setInterval(cleanupGuestUsers, 24 * 60 * 60 * 1000);
};

export default app;
