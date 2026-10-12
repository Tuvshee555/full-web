import { apiRoute } from "../../../../chatbot/api";
import { requireAdminAccess } from "../../../../chatbot/adminAccess";
export default apiRoute(async (req, res) => {
  if (!(await requireAdminAccess(req, res, "api.chatbot.admin.broadcast"))) return;
  return res.status(503).json({ code: "BROADCAST_DISABLED" });
});
