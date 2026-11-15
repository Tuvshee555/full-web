# Security review of the chat assistant (2 November 2026)

Scope: `src/chatbot/**`, `src/pages/api/chatbot/**`, `src/pages/api/jobs/**`, the order service and
the admin section. Each line names where the control lives and what proves it.

| Area | Control | Where | Proof |
| --- | --- | --- | --- |
| API keys | OpenAI key read server-side only; the admin "system" route returns a boolean, never the key; audit entries and logs carry no secrets | `src/chatbot/env.ts`, `admin/system.ts`, `server/utils/audit.js` | DB test asserts the key string is absent from the system response and the audit log |
| Database credentials | Only the server reads `DATABASE_URL`; nothing in `src/app` or `src/admin` imports Prisma | repo layout | `npm run lint` (client code) + typecheck; no `NEXT_PUBLIC_` database variables |
| Admin authorization | Every admin route calls `requireAdminAccess`, which re-checks the ADMIN role in the database per request (not only the JWT); the Express product routes use `requireAdmin` | `src/chatbot/adminAccess.ts`, `server/middleware/requireAdmin.js` | DB test: 401 without a token, 403 for a shopper on conversations, knowledge and the new audit route |
| Customer data isolation | A website visitor reads only their own conversation (id + token hash, timing-safe compare); order status needs the order number AND the phone on that order; no customer list is reachable without admin | `security.js` (`authorizePublic`, `privateOrderStatus`) | eval cases `inj-*`, `status-*`; DB test |
| Order creation | Only after the explicit confirmation turn ("тийм"/"tiim"/"за"); totals are recomputed from the catalogue by `placeOrder`; the chat never claims a payment | `commerce/purchase.ts`, `server/services/placeOrder.js` | eval hard rule "order created without confirmation" on all 296 turns; purchase-flow tests |
| Stock modification | Only the order service (transaction, compare-and-decrement) and the admin product route change stock; the expiry job restocks once (compare-and-set on status) | `server/utils/stock.js`, `server/jobs/expireOrders.js` | commerce tests (concurrent workers release once), DB test (repeated cron run is a no-op) |
| Reservation abuse | Per-phone unpaid limit under an advisory lock; per-item cap; owner-set window; rate limits unchanged (10 chats/hour/address, 15 messages/minute/chat) | `commerce/placeOrder.ts` | DB test (concurrent confirmations → one order) |
| Tool input validation | Every chat order field is parsed by code (phone 8 digits, district from a fixed list, quantity integer, product id from the catalogue); the model never supplies an id, price or quantity that is trusted | `commerce/purchase.ts`, `placeOrder.js` validation | purchase-flow tests; `placeOrder` coded errors |
| Prompt injection | The system prompts declare all customer, history and catalogue text as data; the deterministic verifier rejects any amount, link, stock label or health claim not in the evidence; the understanding model can only pick catalogue keys that code resolves | `productUnderstanding.ts`, `productReplyVerification.ts` | eval cases `inj-*`, `h2-inj-*` (0 unsupported claims across 380 turns) |
| Retrieved content as data | FAQ and product facts are quoted verbatim by code paths, never executed; owner-typed settings are filtered for amounts and claims on save | `knowledge.ts`, `settingsFields.ts`, `admin/faq.ts` | `parseSettingsFields` tests, FAQ amount guard in the DB test |
| Unverified facts | The assistant quotes only facts the owner ticked; changed text loses its tick | `catalogue.ts` (`productKnowledge`), `validate-product.js` (`nextVerifiedFacts`) | language-and-knowledge test; DB test (edited fact not quoted until re-verified) |
| Rate limiting | Public chat routes, admin auth attempts and admin replies are limited; per-conversation limit of 15/min | `api.ts` (`limitRequest`), `security.js` (`rateLimit`) | DB test comments (the first chat hits its limit) |
| Budget enforcement | Daily spend is summed from the ledger; over budget the model is skipped and the rules answer | `aiUsage.ts` (`aiAllowedToday`) | DB test: over budget, 0 model calls, still a reply |
| Scheduled job | Fails closed without `CRON_SECRET` in production; timing-safe compare; at least 16 characters; no body is trusted | `src/pages/api/jobs/expire-orders.ts` | expire-orders tests (`cronAuthorized`), DB test (401, then 200 with the secret) |
| Logs | Error log stores a code and a source, never prompts, tokens or customer text; audit details are summarised and truncated | `security.js` (`logError`), `audit.js` (`summarizeDetails`) | DB test asserts no address and no key in audit rows |
| Secrets in git | `.env*` ignored; the diff was scanned for key patterns, bank and phone numbers of the live shop | — | pre-commit scan in the session log |

Open items (not vulnerabilities, worth knowing):

- The per-phone limit counts chat orders only; a website bank-transfer order still holds stock for
  24 hours with the guest-account limit as its only brake (unchanged from before).
- Messenger/Instagram webhooks do not trigger the due-job sweep (website chat and `/api/*` do); the
  scheduled job covers them.
- The storefront product page still shows unverified text (owner's own content); only the assistant
  withholds it.
