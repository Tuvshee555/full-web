import { logStartupDiagnostics } from "./observability";

// Uudam validation helpers retained; only Lorentz-owned services are configured.
function readOptionalString(
  name: string,
  source: NodeJS.ProcessEnv,
): string | null {
  const raw = source[name];
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length ? trimmed : null;
}

function readBoolean(
  name: string,
  source: NodeJS.ProcessEnv,
  defaultValue: boolean,
  errors: string[],
): boolean {
  const raw = source[name];
  if (typeof raw !== "string" || raw.trim().length === 0) return defaultValue;
  const normalized = raw.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  errors.push(`${name} must be "true" or "false"`);
  return defaultValue;
}

function readPositiveInt(
  name: string,
  source: NodeJS.ProcessEnv,
  defaultValue: number,
  min: number,
  max: number,
  errors: string[],
): number {
  const raw = source[name];
  if (typeof raw !== "string" || raw.trim().length === 0) return defaultValue;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    errors.push(`${name} must be an integer`);
    return defaultValue;
  }
  if (parsed < min) {
    errors.push(`${name} must be >= ${min}`);
    return defaultValue;
  }
  if (parsed > max) {
    errors.push(`${name} must be <= ${max}`);
    return defaultValue;
  }
  return parsed;
}

export function getEnv() {
  const source = process.env;
  const errors: string[] = [];
  const optional = (name: string) => readOptionalString(name, source);
  const integer = (name: string, value: number, min: number, max: number) => readPositiveInt(name, source, value, min, max, errors);
  const tokenPage = optional("META_PAGE_ACCESS_TOKEN") || "";
  const facebookPageId = optional("META_PAGE_ID") || "";
  const env = {
    openaiApiKey: optional("OPENAI_API_KEY") || "",
    verifyToken: optional("META_VERIFY_TOKEN") || "",
    tokenPage, facebookPageId,
    facebookPages: tokenPage && facebookPageId ? [{ pageId: facebookPageId, token: tokenPage }] : [],
    metaAppSecret: optional("META_APP_SECRET") || "",
    neonDatabaseUrl: optional("DATABASE_URL"),
    trustProxyHeaders: readBoolean("TRUST_PROXY_HEADERS", source, Boolean(source.VERCEL), errors),
    adminOpenAccess: false,
    allowAdminSecretQuery: false,
    demoMaxTextChars: integer("DEMO_MAX_TEXT_CHARS", 2000, 1, 2000),
    demoGlobalRateLimit: integer("DEMO_GLOBAL_RATE_LIMIT", 240, 1, 100000),
    adminAuthRateLimit: integer("ADMIN_AUTH_RATE_LIMIT", 20, 1, 100000),
    webhookMaxBodyBytes: integer("WEBHOOK_MAX_BODY_BYTES", 4 * 1024 * 1024, 65536, 4 * 1024 * 1024),
    rateLimitMaxBuckets: integer("RATE_LIMIT_MAX_BUCKETS", 20000, 1000, 200000),
    rateLimitSweepInterval: integer("RATE_LIMIT_SWEEP_INTERVAL", 200, 1, 100000),
    conversationMaxSessions: integer("CONVERSATION_MAX_SESSIONS", 5000, 100, 50000),
    pauseMaxSenders: integer("PAUSE_MAX_SENDERS", 5000, 100, 50000),
    openaiTimeoutMs: integer("OPENAI_TIMEOUT_MS", 8000, 1000, 12000),
    openaiMaxRetries: integer("OPENAI_MAX_RETRIES", 0, 0, 1),
    openaiRetryBaseDelayMs: integer("OPENAI_RETRY_BASE_DELAY_MS", 300, 50, 1000),
    openaiCircuitFailureThreshold: integer("OPENAI_CIRCUIT_FAILURE_THRESHOLD", 5, 1, 50),
    openaiCircuitCooldownMs: integer("OPENAI_CIRCUIT_COOLDOWN_MS", 30000, 1000, 300000),
    metaApiTimeoutMs: integer("META_API_TIMEOUT_MS", 5000, 1000, 10000),
    metaSubscribeMaxRetries: 0,
    metaRetryBaseDelayMs: 300,
    webhookMaxPendingConversations: integer("WEBHOOK_MAX_PENDING_CONVERSATIONS", 5000, 100, 100000),
    broadcastEnabled: false,
  };
  if (errors.length) throw new Error("Invalid server environment configuration:\n- " + errors.join("\n- "));
  logStartupDiagnostics("env", { databaseConfigured: Boolean(env.neonDatabaseUrl), openaiConfigured: Boolean(env.openaiApiKey), metaConfigured: Boolean(env.tokenPage && env.metaAppSecret && env.verifyToken) });
  return env;
}
export type ValidatedEnv = ReturnType<typeof getEnv>;
// Configuration is read per request so secret rotation does not need stale caches.
export function resetEnvCacheForTests() {}
