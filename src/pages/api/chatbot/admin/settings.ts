import { apiRoute } from "../../../../chatbot/api";
import { requireAdminAccess } from "../../../../chatbot/adminAccess";
import { prisma } from "../../../../chatbot/prisma";
import { getSettings, invalidateSettings } from "../../../../chatbot/settings.mjs";
import { parseSettingsFields } from "../../../../chatbot/settingsFields";
import { actorOf, recordAudit } from "../../../../../server/utils/audit.js";
export const config = { api: { bodyParser: { sizeLimit: "64kb" } } };
export default apiRoute(async (req, res) => {
  if (!(await requireAdminAccess(req, res, "api.chatbot.admin.settings"))) return;
  if (req.method === "GET") return res.json(await getSettings());
  if (req.method === "PATCH") {
    const fields = req.body?.fields || req.body;
    let data;
    try { data = parseSettingsFields(fields); }
    catch { return res.status(400).json({ error: "invalid settings" }); }
    const before = await getSettings();
    const settings = await prisma.chatSettings.upsert({ where: { id: "default" }, create: { id: "default", ...data }, update: data });
    invalidateSettings();
    // Only what changed, with text values shortened (audit.js), so the log stays readable.
    const changed = Object.fromEntries(Object.entries(data).filter(([key, value]) => (before as Record<string, unknown>)[key] !== value));
    if (Object.keys(changed).length) recordAudit({ actor: await actorOf(req.user), action: "settings_updated", target: "default", details: changed });
    return res.json(settings);
  }
  return res.status(405).end();
});
