/** Origins are deployment settings; do not trust arbitrary Origin reflection. */
export function corsOptions(env = process.env) {
  const origins = new Set(["http://localhost:3000", "http://localhost:3001"]);
  for (const value of [env.FRONTEND_URL, env.CUSTOMER_URL, env.ADMIN_URL, env.NEXT_PUBLIC_FRONTEND_URL, ...(env.CORS_ALLOWED_ORIGINS || "").split(",")]) {
    if (!value) continue;
    try {
      const url = new URL(value.trim());
      if (["https:", "http:"].includes(url.protocol)) origins.add(url.origin);
    } catch { /* Invalid optional deployment settings never widen access. */ }
  }
  return {
    origin: (origin, callback) => callback(null, !origin || origins.has(origin)),
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Chat-Token"],
  };
}
