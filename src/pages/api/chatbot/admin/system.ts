import { apiRoute } from "../../../../chatbot/api";
import { requireAdminAccess } from "../../../../chatbot/adminAccess";
import { getEnv } from "../../../../chatbot/env";
import { getReadinessReport } from "../../../../chatbot/readiness";
import { getWebhookRuntimeDiagnostics } from "../../../../chatbot/webhookDedup";
import { getRateLimitDiagnostics } from "../../../../chatbot/rateLimit";
import { resolveAiModel } from "../../../../chatbot/aiUsage";
export default apiRoute(async (req, res) => {
  if (!(await requireAdminAccess(req, res, "api.chatbot.admin.system"))) return;
  if (req.method !== "GET") return res.status(405).end();
  const env = getEnv();
  // Whether the key exists, never the key itself.
  return res.json({ ok: true, aiConfigured: Boolean(env.openaiApiKey), defaultModel: resolveAiModel(), readiness: getReadinessReport(env), webhook: getWebhookRuntimeDiagnostics(), rateLimit: getRateLimitDiagnostics() });
});
