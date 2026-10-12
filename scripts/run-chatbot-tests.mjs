import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

// Active suites: tests/chatbot/*.test.(ts|js). Uudam suites that still test travel behaviour wait in
// tests/chatbot/uudam-pending/ (excluded from tsc and from this run) until they are rewritten for
// products; they are listed so the backlog stays visible.
const dir = "tests/chatbot";
const files = fs.readdirSync(dir).filter((file) => /\.test\.(?:ts|js)$/.test(file)).map((file) => path.join(dir, file)).sort();
const pendingDir = path.join(dir, "uudam-pending");
const pending = fs.existsSync(pendingDir) ? fs.readdirSync(pendingDir).filter((file) => file.endsWith(".test.ts")) : [];
console.log(`Chatbot tests: ${files.length} active suites; ${pending.length} Uudam suites pending conversion (tests/chatbot/uudam-pending).`);
const env = { ...process.env, NODE_ENV: "test", ERROR_LOG_DB_ENABLED: "false", DATABASE_URL: "postgresql://test:test@127.0.0.1:1/chatbot_fake", OPENAI_API_KEY: "test-openai-key", META_APP_SECRET: "test-meta-secret", META_PAGE_ACCESS_TOKEN: "test-page-token", META_VERIFY_TOKEN: "test-verify-token" };
for (const key of ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID", "TELEGRAM_CHAT_IDS", "TELEGRAM_STAFF_CHAT_IDS", "TOKEN_PAGE", "REDIS_URL", "OBSERVABILITY_LOG_SINK_URL", "OBSERVABILITY_ERROR_SINK_URL", "OBSERVABILITY_SINK_TOKEN", "OPENAI_MODEL"]) delete env[key];
const result = spawnSync(process.execPath, ["--import", "tsx", "--test", "--test-concurrency=4", ...files], { stdio: "inherit", env });
process.exit(result.status ?? 1);
