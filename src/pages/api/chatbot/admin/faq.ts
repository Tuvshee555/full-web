import { apiRoute, first } from "../../../../chatbot/api";
import { requireAdminAccess } from "../../../../chatbot/adminAccess";
import { prisma } from "../../../../chatbot/prisma";
import { chatError } from "../../../../chatbot/security.js";
import { actorOf, recordAudit } from "../../../../../server/utils/audit.js";

export const config = { api: { bodyParser: { sizeLimit: "64kb" } } };
const MAX_ROWS = 100;
// Facts with amounts belong to the catalogue and the delivery settings; a FAQ answer with a price goes stale unnoticed.
const AMOUNT = /₮|\bMNT\b|\d+\s*%/i;

function parseFaq(body: unknown, partial = false) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw chatError("INVALID_FAQ", 400);
  const input = body as Record<string, unknown>;
  const data: Record<string, string | number | boolean> = {};
  for (const [key, limit] of [["question", 300], ["answer", 2000], ["questionEn", 300], ["answerEn", 2000]] as const) {
    if (!(key in input)) { if (!partial && (key === "question" || key === "answer")) throw chatError("INVALID_FAQ", 400); continue; }
    const value = input[key];
    if (typeof value !== "string" || value.length > limit) throw chatError("INVALID_FAQ", 400);
    if ((key === "question" || key === "answer") && !value.trim()) throw chatError("INVALID_FAQ", 400);
    if (AMOUNT.test(value)) throw chatError("FAQ_AMOUNT", 400);
    data[key] = value.trim();
  }
  if ("enabled" in input) { if (typeof input.enabled !== "boolean") throw chatError("INVALID_FAQ", 400); data.enabled = input.enabled; }
  if ("sortOrder" in input) { const n = Number(input.sortOrder); if (!Number.isInteger(n) || n < 0 || n > 10000) throw chatError("INVALID_FAQ", 400); data.sortOrder = n; }
  return data;
}

/** The owner's shop FAQ: read by the assistant (verbatim answers) and the storefront FAQ page. */
export default apiRoute(async (req, res) => {
  if (!(await requireAdminAccess(req, res, "api.chatbot.admin.faq"))) return;
  if (req.method === "GET") {
    const rows = await prisma.chatFaq.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], take: MAX_ROWS });
    return res.json({ ok: true, rows });
  }
  if (req.method === "POST") {
    const count = await prisma.chatFaq.count();
    if (count >= MAX_ROWS) throw chatError("FAQ_LIMIT", 400);
    const data = parseFaq(req.body);
    const row = await prisma.chatFaq.create({ data: { question: String(data.question), answer: String(data.answer), questionEn: String(data.questionEn ?? ""), answerEn: String(data.answerEn ?? ""), enabled: data.enabled !== false, sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : count + 1 } });
    recordAudit({ actor: await actorOf(req.user), action: "faq_created", target: row.id, details: { question: row.question } });
    return res.status(201).json(row);
  }
  if (req.method === "PATCH") {
    const id = req.body?.id;
    if (typeof id !== "string" || !id) throw chatError("INVALID_FAQ", 400);
    const data = parseFaq(req.body, true);
    delete (data as Record<string, unknown>).id;
    const row = await prisma.chatFaq.update({ where: { id }, data }).catch(() => null);
    if (!row) throw chatError("NOT_FOUND", 404);
    recordAudit({ actor: await actorOf(req.user), action: "faq_updated", target: row.id, details: { question: row.question, fields: Object.keys(data) } });
    return res.json(row);
  }
  if (req.method === "DELETE") {
    const id = first(req.query.id) || req.body?.id;
    if (typeof id !== "string" || !id) throw chatError("INVALID_FAQ", 400);
    const removed = await prisma.chatFaq.delete({ where: { id } }).catch(() => null);
    if (removed) recordAudit({ actor: await actorOf(req.user), action: "faq_deleted", target: id, details: { question: removed.question } });
    return res.status(204).end();
  }
  return res.status(405).end();
});
