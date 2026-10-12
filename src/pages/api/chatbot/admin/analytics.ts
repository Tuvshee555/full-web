import { apiRoute } from "../../../../chatbot/api";
import { requireAdminAccess } from "../../../../chatbot/adminAccess";
import { prisma } from "../../../../chatbot/prisma";
export default apiRoute(async (req, res) => {
  if (!(await requireAdminAccess(req, res, "api.chatbot.admin.analytics"))) return;
  if (req.method !== "GET") return res.status(405).end();
  const real = { channel: { not: "test" } };
  const [totalContacts, needsHuman, paused, totalLeads, newLeads, byStatus, byChannel, recentLeads] = await Promise.all([
    prisma.chatConversation.count({ where: real }), prisma.chatConversation.count({ where: { ...real, needsHuman: true } }), prisma.chatConversation.count({ where: { ...real, paused: true } }),
    prisma.chatLead.count({ where: { conversation: real } }), prisma.chatLead.count({ where: { status: "new", conversation: real } }),
    prisma.chatLead.groupBy({ by: ["status"], where: { conversation: real }, _count: true }), prisma.chatConversation.groupBy({ by: ["channel"], where: real, _count: true }),
    prisma.chatLead.findMany({ where: { conversation: real, createdAt: { gte: new Date(Date.now() - 14 * 86_400_000) } }, select: { createdAt: true } }),
  ]);
  const days = new Map<string, number>();
  for (const row of recentLeads) { const day = row.createdAt.toISOString().slice(0, 10); days.set(day, (days.get(day) || 0) + 1); }
  return res.json({ ok: true, stats: { totalContacts, needsHuman, paused, totalLeads, newLeads, leadsByStatus: Object.fromEntries(byStatus.map((r) => [r.status, r._count])), conversationsByChannel: Object.fromEntries(byChannel.map((r) => [r.channel, r._count])), leadsByDay: [...days.entries()].sort().map(([date, count]) => ({ date, count })) } });
});
