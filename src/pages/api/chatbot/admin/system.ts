import { apiRoute } from "../../../../chatbot/api";
import { requireAdminAccess } from "../../../../chatbot/adminAccess";
import { getEnv } from "../../../../chatbot/env";
import { getReadinessReport } from "../../../../chatbot/readiness";
import { getWebhookRuntimeDiagnostics } from "../../../../chatbot/webhookDedup";
import { getRateLimitDiagnostics } from "../../../../chatbot/rateLimit";
export default apiRoute(async (req, res) => {
  if (!(await requireAdminAccess(req, res, "api.chatbot.admin.system"))) return;
  if (req.method !== "GET") return res.status(405).end();
  return res.json({ ok: true, readiness: getReadinessReport(getEnv()), webhook: getWebhookRuntimeDiagnostics(), rateLimit: getRateLimitDiagnostics() });
});
