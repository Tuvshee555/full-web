import { apiRoute, first, publicMessages } from "../../../../chatbot/api";
import { requireAdminAccess } from "../../../../chatbot/adminAccess";
import { prisma } from "../../../../chatbot/prisma";
export default apiRoute(async (req, res) => {
  if (!(await requireAdminAccess(req, res, "api.chatbot.admin.conversation"))) return;
  if (req.method !== "GET") return res.status(405).end();
  const id = first(req.query.sender_id) || first(req.query.id);
  if (!id) return res.status(400).json({ error: "sender_id required" });
  const c = await prisma.chatConversation.findUnique({ where: { id } });
  if (!c) return res.status(404).end();
  return res.json({ ok: true, ...c, messages: await publicMessages(c.id) });
});
