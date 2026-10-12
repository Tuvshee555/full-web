import { apiRoute, first } from "../../../../chatbot/api";
import { requireAdminAccess } from "../../../../chatbot/adminAccess";
import { prisma } from "../../../../chatbot/prisma";
export default apiRoute(async (req, res) => {
  if (!(await requireAdminAccess(req, res, "api.chatbot.admin.error_logs"))) return;
  if (req.method !== "GET") return res.status(405).end();
  const hours = Math.max(1, Math.min(168, Number(first(req.query.hours)) || 24));
  const level = first(req.query.level);
  const event = first(req.query.event);
  const where = { createdAt: { gte: new Date(Date.now() - hours * 3_600_000) }, ...(["error", "warn", "info"].includes(level) ? { level } : {}), ...(event ? { code: event } : {}) };
  const rows = await prisma.chatErrorLog.findMany({ where, orderBy: { createdAt: "desc" }, take: Math.max(1, Math.min(200, Number(first(req.query.limit)) || 100)) });
  const summary = await prisma.chatErrorLog.groupBy({ by: ["code", "level"], where, _count: true });
  return res.json({ ok: true, configured: true, retentionDays: 7,
    rows: rows.map((r) => ({ id: r.id, created_at: r.createdAt, level: r.level, event: r.code, message: r.source, fields: r.details, request_id: "", correlation_id: "", sender_hash: "" })),
    summary: summary.map((r) => ({ event: r.code, level: r.level, count: r._count, last_at: "" })) });
});
