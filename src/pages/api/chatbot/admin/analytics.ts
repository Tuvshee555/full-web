import { apiRoute, first } from "../../../../chatbot/api";
import { requireAdminAccess } from "../../../../chatbot/adminAccess";
import { prisma } from "../../../../chatbot/prisma";
import { summarizeAssistantMessages, summarizeUsage } from "../../../../chatbot/analytics";
import { getAiUsageSummary, todayAiCostUsd } from "../../../../chatbot/aiUsage";
import { getSettings } from "../../../../chatbot/settings.mjs";

const FAILURE_CODES = ["openai.fallback_failed", "BOT_FAILURE", "HANDLER_FAILURE", "API_UNAVAILABLE", "CHAT_UNAVAILABLE"];
const CHAT_ORDER_NOTES = ["Чатаар захиалсан", "Ordered in the website chat"];

/** Counts for the admin: the long-standing totals (used by the menu badges) plus this period's activity and model spend. */
export default apiRoute(async (req, res) => {
  if (!(await requireAdminAccess(req, res, "api.chatbot.admin.analytics"))) return;
  if (req.method !== "GET") return res.status(405).end();
  const periodDays = first(req.query.days) === "30" ? 30 : 7;
  const since = new Date(Date.now() - periodDays * 86_400_000);
  const real = { channel: { not: "test" } };
  const [totalContacts, needsHuman, paused, totalLeads, newLeads, byStatus, byChannel, recentLeads] = await Promise.all([
    prisma.chatConversation.count({ where: real }), prisma.chatConversation.count({ where: { ...real, needsHuman: true } }), prisma.chatConversation.count({ where: { ...real, paused: true } }),
    prisma.chatLead.count({ where: { conversation: real } }), prisma.chatLead.count({ where: { status: "new", conversation: real } }),
    prisma.chatLead.groupBy({ by: ["status"], where: { conversation: real }, _count: true }), prisma.chatConversation.groupBy({ by: ["channel"], where: real, _count: true }),
    prisma.chatLead.findMany({ where: { conversation: real, createdAt: { gte: new Date(Date.now() - 14 * 86_400_000) } }, select: { createdAt: true } }),
  ]);
  const days = new Map<string, number>();
  for (const row of recentLeads) { const day = row.createdAt.toISOString().slice(0, 10); days.set(day, (days.get(day) || 0) + 1); }
  const stats = { totalContacts, needsHuman, paused, totalLeads, newLeads, leadsByStatus: Object.fromEntries(byStatus.map((r) => [r.status, r._count])), conversationsByChannel: Object.fromEntries(byChannel.map((r) => [r.channel, r._count])), leadsByDay: [...days.entries()].sort().map(([date, count]) => ({ date, count })) };

  const inPeriod = { createdAt: { gte: since }, conversation: real };
  const [conversationsStarted, activeConversations, customerMessages, assistantRows, leadsInPeriod, leadsByReason, ordersFromChat, failures, rejectedReplies, usageRows, settings, todayCostUsd] = await Promise.all([
    prisma.chatConversation.count({ where: { ...real, createdAt: { gte: since } } }),
    prisma.chatConversation.count({ where: { ...real, updatedAt: { gte: since } } }),
    prisma.chatMessage.count({ where: { ...inPeriod, role: "customer" } }),
    prisma.chatMessage.findMany({ where: { ...inPeriod, role: "assistant" }, orderBy: { createdAt: "desc" }, take: 5000, select: { createdAt: true, metadata: true, clientMessageId: true, conversationId: true } }),
    prisma.chatLead.count({ where: { conversation: real, createdAt: { gte: since } } }),
    prisma.chatLead.groupBy({ by: ["reason"], where: { conversation: real, createdAt: { gte: since } }, _count: true }),
    prisma.order.count({ where: { createdAt: { gte: since }, notes: { in: CHAT_ORDER_NOTES } } }),
    prisma.chatErrorLog.count({ where: { createdAt: { gte: since }, code: { in: FAILURE_CODES } } }),
    prisma.chatErrorLog.count({ where: { createdAt: { gte: since }, code: "writer.reply_rejected" } }),
    getAiUsageSummary(periodDays).catch(() => []),
    getSettings(),
    todayAiCostUsd().catch(() => 0),
  ]);
  const activity = summarizeAssistantMessages(assistantRows);
  // The customer questions behind the replies that gave no real answer, so the owner can add the missing facts.
  const lookups = activity.unansweredReplies.slice(0, 40).filter((item) => item.customerClientMessageId);
  const questions = lookups.length ? await prisma.chatMessage.findMany({ where: { OR: lookups.map((item) => ({ conversationId: item.conversationId, clientMessageId: item.customerClientMessageId! })) }, select: { conversationId: true, clientMessageId: true, text: true, createdAt: true } }) : [];
  const questionByKey = new Map(questions.map((row) => [`${row.conversationId}:${row.clientMessageId}`, row]));
  const unansweredQuestions = lookups.map((item) => { const row = questionByKey.get(`${item.conversationId}:${item.customerClientMessageId}`); return row ? { conversationId: item.conversationId, text: row.text.slice(0, 300), at: row.createdAt, kind: item.kind } : null; }).filter(Boolean);
  const { unansweredReplies: _dropped, ...period } = activity;
  void _dropped;
  const usage = summarizeUsage(usageRows.map((row) => ({ day: row.day, model: row.model, calls: row.calls, promptTokens: row.promptTokens, completionTokens: row.completionTokens, estCostUsd: row.estCostUsd })));
  return res.json({
    ok: true, periodDays, stats,
    period: { ...period, conversationsStarted, activeConversations, customerMessages, leads: leadsInPeriod, leadsByReason: Object.fromEntries(leadsByReason.map((r) => [r.reason, r._count])), ordersFromChat, unansweredQuestions },
    ai: { ...usage, failures, rejectedReplies, budgetUsd: settings.aiDailyBudgetUsd, todayCostUsd: Math.round(todayCostUsd * 10000) / 10000, model: settings.aiModel || process.env.OPENAI_MODEL || "gpt-4.1", configured: Boolean(process.env.OPENAI_API_KEY) },
  });
});
