# Lorentz assistant delivery report

Delivered 2026-10-12 (Asia/Ulaanbaatar). Website and admin are implemented. Optional Meta channels are implemented and tested with fake signed payloads, but remain disabled pending the store's own Meta credentials.

## Implementation and port boundaries

The source-to-destination map is in [PLAN.md](PLAN.md), with judgments in [DECISIONS.md](DECISIONS.md). Uudam was read-only throughout. No Uudam database, Vercel deployment, app, page token, shared memory or Obsidian notes were accessed or modified. Travel-specific code, Redis, flows, trip/departure content, media/document sync, posters and Uudam QPay were not ported.

| Area | Files / behavior |
| --- | --- |
| Unified engine | `server/chatbot/handler.js`: website, admin test, Messenger and Instagram all call `handleCustomerMessage()` |
| Understanding | `understanding.js`: current-turn intent, product references, bounded history, follow-ups, Latin Mongolian, typed structured response, configurable `gpt-4o`, 12-second provider timeout, no cheaper-model retry |
| Live evidence | `catalogue.js`: request-time Prisma catalogue; shared store facts in `src/config/store-data.mjs`, typed facade `src/config/store.ts`; order/bot delivery fee in `server/utils/deliveryFee.js` |
| Fact safety | `reply.js`: one product price/stock formatter, deterministic evidence renderer and full evidence-equality verifier; no model prose sent to customers; ingredients/usage/product FAQ from source; unsupported answers hand off |
| Privacy/security | `security.js`: separate random conversation capability token, hashed storage, persistent IP/conversation rate windows, sanitized error codes; order number plus normalized matching phone yields only status |
| State/handoff | Prisma history, selected-product state and processing leases; persisted leads, contact capture while paused, Telegram owner alert through `background()`; no server workers, intervals or self-fetch loops |
| Stock | `server/utils/stockLevel.js`: shared size/product policy; public APIs conceal exact positive counts by default; admin inventory retains editable counts; `StockBadge.tsx`, product card/page/size picker and admin list |
| Order hardening | `server/utils/stock.js` and `create-orders.js`: missing or invented variants cannot bypass reservations or order sold-out stock |
| Public API | `server/chatbot/routes.js`, mounted `/api/chat` in the existing Express app; both local combined server and Vercel catch-all adapter work; transcript and message routes require the conversation token |
| Store widget | `src/components/chatbot/ShopChatWidget.tsx`, `ChatThread.tsx`, customer `AppShellClient.tsx`; sharp corners, existing fonts/palette, localized UI, storage guarded by try/catch, polling human replies, mobile bottom clearance; Strict Mode session creation deduplicated |
| Admin | `server/chatbot/admin.js`, `src/admin/components/chatbot/`, sidebar/home view and mn/en messages; Inbox, takeover/handback, human replies, leads/statuses, localized settings, test chat and safe error logs; existing DB-backed `requireAdmin` |
| Meta | `server/chatbot/meta.js`: raw SHA-256 HMAC, verify-token handshake, persistent receipt dedup and atomic outbound claims; bot/outbound switches checked; only persisted success acknowledged; ambiguous send timeouts marked uncertain; guide in [META_SETUP.md](META_SETUP.md) |

The admin opens at `/admin/mn/home-page?view=chatbot` or `/admin/en/home-page?view=chatbot`. Public POST bodies are capped at 4 MiB, below Vercel's request limit. The existing API adapter retains `maxDuration: 30` and post-response work goes through its existing background/waitUntil mechanism.

## Database

Migration `20261012000000_chatbot` was generated, inspected and applied with `prisma migrate deploy`; client generation passed. Additive tables only:

`ChatSettings`, `ChatConversation`, `ChatMessage`, `ChatLead`, `ChatErrorLog`, `ChatRateBucket`, `ChatWebhookEvent`.

No existing model/table was dropped, renamed or truncated. The owner-editable single settings row is lazily initialized. Exact stock defaults off, threshold defaults to 5, bot defaults on, Meta outbound defaults off.

## Verification

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | Passed |
| `npm run lint` | Passed, with one pre-existing unused-disable warning in SignInInner |
| `npm run test:chatbot` | 10/10 passed: formatter, invented price/name/claim/stock rejection, product FAQ evidence, order privacy, language, stock policy/count visibility/variant bypass, signed Meta payloads and credential gating |
| `npm run build` | Passed; existing Tailwind duration ambiguity warnings only |
| `scripts/chatbot-order-smoke.mjs` | Real BANK order controller, reservation and idempotency passed; exact test-user records deleted and tracked stock transactionally restored; no invoice created or paid |
| `scripts/chatbot-api-smoke.mjs` | Local and production storefront/API, token privacy, message idempotency, verified provider answer, human polling and takeover checked |
| `scripts/chatbot-admin-smoke.mjs` | Anonymous rejection, forged ADMIN claim rejected using DB role, settings validation, persistent test chat, takeover/handback, idempotent human reply, lead status and cleanup passed |
| `scripts/chatbot-meta-smoke.mjs` | Both fake channels: handshake, tampered/unsigned rejection, DB dedup, handoff and outbound-off passed; all fake channel records removed |
| `scripts/chatbot-runtime-smoke.mjs` | Missing key, provider HTTP failure, fallback/lead capture, paused contact capture, global-off branch, processing lease, interrupted request recovery, follow-up product memory, persistent rate limit, fresh post-provider price/stock evidence and concurrent admin takeover checked |
| Mobile visual check | Widget rendered and answered an English delivery question at 390 × 844; [screenshot](WIDGET_MOBILE.png); the exact browser test conversation was identified, marked test and removed |
| Production | `/mn`, `/en`, `/api/food` and real website chat served successfully; anonymous admin settings returned 401; unconfigured Meta returned 503; Vercel production builds confirmed Ready |

Final catalogue QA: **50/50 (100%)**, with **0 detected invented facts and 0 privacy leaks**. There are 30 Cyrillic Mongolian messages, 5 Latin Mongolian messages and 15 English messages. Every case uses a request-time database catalogue and an isolated order-status fixture. The initial run scored 45/50 solely because English questions containing Cyrillic product names were misclassified; product names are now removed before language detection. Subsequent full reruns passed 50/50; the final result is recorded in the linked table.

The complete message/reply/pass/reason table is in [QA_RESULTS.md](QA_RESULTS.md), with machine-readable data in [QA_RESULTS.json](QA_RESULTS.json). These are measurements of the covered cases, not a claim that all future questions will be understood. The renderer's evidence gate separately prevents model-written factual prose from reaching a customer.

All automated QA conversations/leads/errors and isolated order/user fixtures were deleted by exact IDs. BANK reservation tests restored only the inventory reserved by those test orders. No real customer's records were deleted.

## Environment and operation

| Variable | State |
| --- | --- |
| `OPENAI_API_KEY` | Present in ignored `.env.local`; added to Vercel production as a sensitive variable via stdin; never committed or printed |
| `OPENAI_MODEL` | Local `gpt-4o`; production uses the same default if unset |
| `META_PAGE_ACCESS_TOKEN` | Missing; Meta disabled |
| `META_APP_SECRET` | Missing; Meta disabled |
| `META_VERIFY_TOKEN` | Missing; Meta disabled |
| `META_GRAPH_VERSION` | Optional, defaults `v23.0`; choose a supported version when configuring the new app |
| `DELIVERY_FEE` | Existing optional server setting; shared default used when unset; the resolved numeric value is bundled for the storefront at build time |
| Telegram | Existing store credentials reused only for real handoffs; QA test-channel alerts suppressed; sends now have a bounded timeout and sanitized failure logging |

Only `.env.example` is tracked, containing placeholders. Shared facts now belong in `src/config/store-data.mjs`; existing imports through `src/config/store.ts` remain typed and compatible. Structured response construction follows [official OpenAI documentation](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=chat).

## Limits and follow-up operation

- The live catalogue currently lacks some structured product usage/FAQ/ingredient details. The bot offers staff assistance for missing evidence. Populate truthful `PRODUCT_CONTENT` or catalogue fields to improve coverage; no placeholder claims were invented.
- Product names, variant labels and published source descriptions are preserved verbatim. The assistant's surrounding language and stock labels are Mongolian/English; it does not manufacture translations of product facts.
- Real Messenger/Instagram account delivery cannot be confirmed before the new Page/app and credentials exist. Meta account permissions, review and messaging windows apply. No Uudam token is used. An ambiguous outgoing timeout is marked uncertain; inspect the platform inbox before resending.
- Conversations and leads contain the customer's voluntarily supplied text/contact details. Inbox access requires admin auth; public transcript access requires the secret capability token. The store should choose a retention period before volume grows. Expired rate buckets/error logs currently require periodic operator cleanup; no additional recurring service was introduced.
- Long responses fall back to staff instead of cutting prices, stock facts or links. Product recommendations are catalogue options, without promises of suitability, growth or medical results.
- Local Windows builds require stopping a running Prisma-backed server before `prisma generate`, because the loaded query-engine DLL is locked. This does not affect the verified Vercel builds.

## Phase commits

| Phase | Commit |
| --- | --- |
| 0 — source map / decisions | `986ab3bf45d87edb4badc4c6b1f32549eb32884b` |
| 1 — additive data / stock | `9bc028f9e68359ce7d481a9e2f9fe400c1757fd3` |
| 2 — verified core | `e1cc36d040e05db5244e71c416fd27fe1c9314e5` |
| 3 — website / API | `da3b8019f6611eb143d72372dd7cd2b45db77f97` |
| 4 — admin | `7a07322823d6d03fee85c2fccc79f153528690c9` |
| 5 — Meta / verification fixes | `f8eea7a055c0f16e4d2fe22e39125d2f18f31682` |
| 6 — final QA / report / runtime polish | Recorded below after committing this phase |

Each phase was pushed to `main` after its checks; production health and deployment status were verified. The pre-existing untracked `docs/codex/` material was left untouched and unstaged.
