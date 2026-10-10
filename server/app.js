// Express API app. It is mounted at /api by the combined server (../server.mjs)
// and can also run on its own via ./index.js. Both runners load the .env files
// before importing this module, because routers create the Prisma client at
// import time.
import express from "express";
import cors from "cors";
import { userRouter } from "./routers/user.router.js";
import { foodRouter } from "./routers/food.router.js";
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

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://food-delivery-customer.vercel.app",
      "https://food-delivery-admin-peach.vercel.app",
      "https://food-delivery-admin-z918.vercel.app",
      "https://delivery-customer.shop",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options("*", cors());

app.use(express.json({
  limit: "10mb",
  verify: (req, res, buf) => {
    req.rawBody = buf;
  },
}));

app.use(express.urlencoded({ extended: true }));

app.get("/", (_, res) => {
  res.send("ðŸš€ Backend Running");
});

app.use("/food", foodRouter);
app.use("/order", orderRouter);
app.use("/user", userRouter);
app.use("/category", categoryRouter);
app.use("/items", items);
app.use("/qpay", qpayRouter);
app.use("/stats", statRouter);
app.use("/email", emailRouter);
app.use("/upload", uploadRouter);
app.use("/review", reviewRouter);

app.use((err, req, res, next) => {
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
