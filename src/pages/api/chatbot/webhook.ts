import { apiRoute, first, limitRequest } from "../../../chatbot/api";
import { metaConfigured } from "../../../chatbot/metaDelivery";
import { parseMetaEvents, processMetaEvents } from "../../../chatbot/webhookRuntime";
import { readRawBody, verifyToken, isRetryableWebhookError } from "../../../chatbot/webhookDedup";
import { parseWebhookJson, PayloadTooLargeError, verifyMetaSignature } from "../../../chatbot/webhookSecurity";
export const config = { api: { bodyParser: false }, maxDuration: 30 };
export default apiRoute(async (req, res) => {
  if (!metaConfigured()) return res.status(503).json({ code: "META_DISABLED" });
  if (req.method === "GET") {
    if (req.query["hub.mode"] === "subscribe" && verifyToken(first(req.query["hub.verify_token"])) && typeof req.query["hub.challenge"] === "string") return res.status(200).send(req.query["hub.challenge"]);
    return res.status(403).end();
  }
  if (req.method !== "POST") return res.status(405).end();
  let raw: Buffer;
  try { raw = await readRawBody(req); }
  catch (error) { if (error instanceof PayloadTooLargeError) return res.status(413).end(); throw error; }
  if (!verifyMetaSignature(raw, first(req.headers["x-hub-signature-256"]), process.env.META_APP_SECRET || "")) return res.status(403).end();
  await limitRequest(req, "webhook", 120);
  let body: unknown;
  try { body = parseWebhookJson(raw); } catch { return res.status(400).json({ code: "INVALID_META_JSON" }); }
  try { await processMetaEvents(parseMetaEvents(body)); }
  catch (error) { if (isRetryableWebhookError(error)) return res.status(503).json({ code: "META_RETRY" }); throw error; }
  return res.json({ received: true });
});
