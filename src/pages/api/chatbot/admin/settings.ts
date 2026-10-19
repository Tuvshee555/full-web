import { apiRoute } from "../../../../chatbot/api";
import { requireAdminAccess } from "../../../../chatbot/adminAccess";
import { prisma } from "../../../../chatbot/prisma";
import { getSettings, invalidateSettings } from "../../../../chatbot/settings.mjs";
import { parseSettingsFields } from "../../../../chatbot/settingsFields";
export const config = { api: { bodyParser: { sizeLimit: "64kb" } } };
export default apiRoute(async (req, res) => {
  if (!(await requireAdminAccess(req, res, "api.chatbot.admin.settings"))) return;
  if (req.method === "GET") return res.json(await getSettings());
  if (req.method === "PATCH") {
    const fields = req.body?.fields || req.body;
    let data;
    try { data = parseSettingsFields(fields); }
    catch { return res.status(400).json({ error: "invalid settings" }); }
    const settings = await prisma.chatSettings.upsert({ where: { id: "default" }, create: { id: "default", ...data }, update: data });
    invalidateSettings();
    return res.json(settings);
  }
  return res.status(405).end();
});
