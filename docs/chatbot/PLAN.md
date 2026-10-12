# Lorentz chatbot port

Implementation is plain ESM in `server/chatbot/`, mounted by the shared Express app. Both `server.mjs` and the Vercel catch-all adapter use it. Phase order: map → additive data/stock → engine → website → admin → optional Meta → QA.

The Uudam checkout, database, configuration and Meta services are read-only references. The Claude/Obsidian map was excluded under this session's memory policy. Source inspection replaces that map.

| Uudam source inspected | Decision | Lorentz destination |
| --- | --- | --- |
| `customerTurn.ts`, `strings.ts`, `travelTextNorm.ts` | Adapt normalization and separate current intent from product references; drop travel names | `server/chatbot/understanding.js` |
| `conversation.ts`, `conversationMemory.ts` | Adapt bounded history and durable selected product/contact state; no generated memory facts | `server/chatbot/handler.js`, Prisma ChatConversation/ChatMessage |
| `reply.ts`, `replyReasoning.ts`, `chatbotReplyPolicy.ts` | Adapt concise replies, first answer current question, structured understanding | `understanding.js`, `reply.js` |
| `tripReplyVerification.ts` | Adapt verification concept; drop travel verifier and duplicate fare paths | `reply.js`: exact evidence renderer + verifier |
| `handoffDetection.ts`, `pause.ts` | Adapt human requests/complaints, database pause and lead lifecycle | `handler.js`, `admin.js` |
| `openaiProvider.ts`, `openaiFallback.ts`, `env.ts` | Adapt timed structured requests; remove cheaper model retries | `understanding.js` |
| `rateLimit.ts` | Adapt persistent fixed windows; drop Redis/process maps | `security.js`, ChatRateBucket |
| `webhookSecurity.ts`, `webhookDedup.ts` | Adapt raw-body HMAC and database event claims | `meta.js`, ChatWebhookEvent |
| `messenger.ts`, `instagram.ts`, `metaOutboundKillSwitch.ts` | Adapt text transport and outbound checks; drop media/comment/quick-reply machinery | `meta.js` |
| `chatbotReplyTelemetry.ts` | Adapt safe codes and duration/model/intent metadata | ChatErrorLog, ChatMessage.metadata |
| `webhook.ts`, `demo.ts` | Replace divergent handlers with one function | `handler.js`: handleCustomerMessage |
| `BotTab`, `LeadsTab`, `SettingsTab`, `GreetingTab`, `ErrorLogsTab` | Adapt inbox/lead/settings/testing/diagnostic concepts to existing admin UI | `src/admin/components/chatbot/` |
| `replyMediaPolicy`, `quickReplyTitle`, `webhookPhotoOnly`, `webhookMedia`, `webhookAttachments` | Drop media flows; unsupported inbound messages receive human help | `meta.js` |
| `passengerTotalReply`, `tripHotelReply`, `tripPlaceDaysReply`, travel domain, flows, sync, documents, QPay, posters | Drop completely | No destination |

Checks at each phase: TypeScript, lint, unit tests as introduced, local HTTP smoke. Production build and catalogue QA before completion. Never pay invoices; test orders use BANK and isolated fixtures with exact-ID cleanup and transactional inventory restoration.
