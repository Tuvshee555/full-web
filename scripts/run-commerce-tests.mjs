import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const dir = "tests/commerce";
const files = fs.readdirSync(dir).filter((file) => /\.test\.(?:ts|js|mjs)$/.test(file)).map((file) => path.join(dir, file)).sort();
// Never inherit real database/service credentials in controller tests.
const env = { ...process.env, NODE_ENV: "test", DATABASE_URL: "postgresql://test:test@127.0.0.1:1/commerce_isolated?sslmode=disable", DIRECT_URL: "postgresql://test:test@127.0.0.1:1/commerce_isolated?sslmode=disable", JWT_SECRET: "commerce-test-only-not-a-real-secret", ERROR_LOG_DB_ENABLED: "false" };
for (const key of Object.keys(env)) {
  if (/^(?:QPAY_|SMTP_|EMAIL_|CLOUDINARY_|TELEGRAM_|META_|OPENAI_|REDIS_|OBSERVABILITY_)/.test(key)) delete env[key];
}
const result = spawnSync(process.execPath, ["--import", "tsx", "--test", "--test-concurrency=4", ...files], { stdio: "inherit", env });
process.exit(result.status ?? 1);
