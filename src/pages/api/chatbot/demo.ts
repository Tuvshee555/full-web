import { apiRoute, authorizePublic, limitRequest, publicMessages } from "../../../chatbot/api";
import { handleCustomerMessage } from "../../../chatbot/handler";
import { chatError } from "../../../chatbot/security.js";
export const config = { api: { bodyParser: { sizeLimit: "64kb" } }, maxDuration: 30 };
// Demo and webhook delegate to the same ported engine.
export default apiRoute(async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  await limitRequest(req, "demo", 40);
  if (typeof req.body?.conversationId !== "string" || typeof req.body?.text !== "string") throw chatError("INVALID_MESSAGE", 400);
  const c = await authorizePublic(req, req.body.conversationId);
  const result = await handleCustomerMessage({ conversationId: c.id, text: req.body.text, clientMessageId: req.body.clientMessageId });
  return res.json({ ...result, messages: await publicMessages(c.id) });
});
