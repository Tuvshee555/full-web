import { apiRoute, first } from "../../../../chatbot/api";
import { requireAdminAccess } from "../../../../chatbot/adminAccess";
import { prisma } from "../../../../chatbot/prisma";
const VALID_CRM_STATUSES = ["new", "contacted", "done"];
export default apiRoute(async (req, res) => {
  if (!(await requireAdminAccess(req, res, "api.chatbot.admin.leads"))) return;
  if (req.method === "GET") {
    const page = Math.max(1, Math.min(10000, Number(first(req.query.page)) || 1));
    const where = { conversation: { channel: { not: "test" } } };
    const [rows, total, newCount] = await Promise.all([prisma.chatLead.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * 50, take: 50 }), prisma.chatLead.count({ where }), prisma.chatLead.count({ where: { ...where, status: "new" } })]);
    return res.json({ ok: true, rows, total, page, new_count: newCount });
  }
  if (req.method === "PATCH") {
    const id = req.body?.id;
    const status = req.body?.status || req.body?.lead_status;
    if (typeof id !== "string" || !VALID_CRM_STATUSES.includes(status)) return res.status(400).json({ error: "invalid lead_status" });
    const existing = await prisma.chatLead.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "lead_not_found" });
    const row = await prisma.chatLead.update({ where: { id }, data: { status } });
    return res.json(row);
  }
  return res.status(405).end();
});
