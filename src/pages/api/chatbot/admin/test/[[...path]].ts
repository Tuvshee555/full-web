import { apiRoute, deleteTestConversation, limitRequest, publicMessages } from "../../../../../chatbot/api";
import { requireAdminAccess } from "../../../../../chatbot/adminAccess";
import { prisma } from "../../../../../chatbot/prisma";
import { handleCustomerMessage } from "../../../../../chatbot/handler";
import { chatError, hash, newToken } from "../../../../../chatbot/security.js";

export const config = { api: { bodyParser: { sizeLimit: "64kb" } }, maxDuration: 30 };
export default apiRoute(async (req, res) => {
  if (!(await requireAdminAccess(req, res, "api.chatbot.admin.test"))) return;
  const [id] = (req.query.path as string[]) || [];
  if (id && req.method === "DELETE") {
    const c = await prisma.chatConversation.findUnique({ where: { id } });
    const state = c?.state && typeof c.state === "object" && !Array.isArray(c.state) ? c.state : {};
    if (!c || c.channel !== "test" || state.adminId !== req.user?.id) throw chatError("NOT_FOUND", 404);
    await deleteTestConversation(id); return res.status(204).end();
  }
  if (id || req.method !== "POST") return res.status(405).end();
  await limitRequest(req, "admin-test", 30);
  if (typeof req.body?.text !== "string") throw chatError("INVALID_MESSAGE", 400);
  let c = req.body.conversationId ? await prisma.chatConversation.findFirst({ where: { id: req.body.conversationId, channel: "test" } }) : null;
  if (!c && req.body.conversationId) throw chatError("NOT_FOUND", 404);
  if (!c) c = await prisma.chatConversation.create({ data: { channel: "test", tokenHash: hash(newToken()), state: { adminId: req.user?.id }, locale: req.body.locale === "en" ? "en" : "mn" } });
  const state = c.state && typeof c.state === "object" && !Array.isArray(c.state) ? c.state : {};
  if (state.adminId !== req.user?.id) throw chatError("NOT_FOUND", 404);
  const result = await handleCustomerMessage({ conversationId: c.id, text: req.body.text, clientMessageId: req.body.clientMessageId });
  return res.json({ ...result, messages: await publicMessages(c.id) });
});
