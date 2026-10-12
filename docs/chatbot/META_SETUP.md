# Messenger and Instagram setup

The endpoints return 503 until `META_PAGE_ACCESS_TOKEN`, `META_APP_SECRET`, and `META_VERIFY_TOKEN` are all set. Outbound messages additionally require Settings → Send to Messenger / Instagram. It defaults off. No Uudam app or page token is used.

1. Create the Lorentz Facebook Page and a separate Meta developer app. For Instagram, link a professional Instagram account to that Page and enable Instagram messaging using Facebook Login / Page access tokens. The Instagram Login token flow is not implemented.
2. Obtain a Page token authorized to message the new Page and its linked Instagram account. Complete Meta's required permissions and app review for your integration. Set the three credentials privately in Vercel production. Set `META_GRAPH_VERSION` to a version supported by your app (default `v23.0`).
3. Register ONE callback URL, `https://full-web-lac.vercel.app/api/chatbot/webhook`, for both Page messaging and Instagram messaging (the payload's `object` field tells them apart). Use the same private verify token. Subscribe to `messages` (and `messaging_postbacks`). GET verification echoes the challenge only for the correct token; POST requires raw-body SHA-256 HMAC with the app secret. Register the final URL directly: Meta does not follow redirects, so the old `/api/chat/...` paths will not work.
4. Keep outbound off, send a test message, and inspect the Chatbot inbox. Confirm the correct channel and conversation. Then enable outbound and send another message.
5. Test human takeover and bot handback. Disable global bot and outbound switches to confirm no automated sending. Check delivery status and safe error codes in the inbox and error logs.

Database event IDs and message claims prevent duplicate concurrent sends. A failed HTTP response can be retried when Meta redelivers the inbound event. An ambiguous network timeout is marked `uncertain` and is not automatically resent. Inspect the platform inbox before a manual reply. This avoids falsely promising exactly-once delivery across an external API.

Meta's messaging window and account permissions still apply. Human replies outside the allowed window can fail; no unsolicited outbound campaigns or unsupported tags are implemented. No real Meta delivery has been tested because this store has no Page credentials yet.

Provider references: [Meta's Messenger collection](https://www.postman.com/meta/messenger-platform-api/documentation/iyp204x/messenger-platform-api), [Webhook setup](https://developers.facebook.com/docs/graph-api/webhooks/getting-started). Fake signed payload tests run with `npm run test:chatbot`.
