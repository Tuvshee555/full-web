import { apiRoute, first } from "../../../../chatbot/api";
import { requireAdminAccess } from "../../../../chatbot/adminAccess";
import { prisma } from "../../../../chatbot/prisma";

const PAGE_SIZE = 50;
/** Groups the owner can filter by; each maps to the audit actions it covers. */
export const AUDIT_GROUPS: Record<string, string[]> = {
  settings: ["settings_updated"],
  knowledge: ["faq_created", "faq_updated", "faq_deleted", "product_facts_updated"],
  handover: ["conversation_taken_over", "conversation_handed_back", "conversation_notes"],
  orders: ["chat_order_created", "orders_expired"],
};

/** The audit trail: who changed a setting, a FAQ, a product's facts, who took a chat over, which orders the assistant created. */
export default apiRoute(async (req, res) => {
  if (!(await requireAdminAccess(req, res, "api.chatbot.admin.audit"))) return;
  if (req.method !== "GET") return res.status(405).end();
  const page = Math.max(1, Math.min(1000, Number(first(req.query.page)) || 1));
  const group = first(req.query.group);
  const where = AUDIT_GROUPS[group] ? { action: { in: AUDIT_GROUPS[group] } } : {};
  const [rows, total] = await Promise.all([
    prisma.chatAuditLog.findMany({ where, orderBy: { createdAt: "desc" }, take: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE }),
    prisma.chatAuditLog.count({ where }),
  ]);
  return res.json({ ok: true, rows, total, page, pageSize: PAGE_SIZE, groups: Object.keys(AUDIT_GROUPS) });
});
