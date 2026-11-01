# Lorentz assistant architecture (reference commerce chatbot)

Lorentz is the reference commerce implementation of the shared conversation engine. The engine is
business-agnostic; the commerce behaviour is an adapter. A new shop (or, later, an appointment or
travel business) keeps the engine and writes its own adapter and knowledge source.

## Shared conversation engine (keep when reusing)

| Concern | Module |
| --- | --- |
| One entry point, lease, dedup, persistence, leads, alerts, takeover, auto hand-back, model budget | `src/chatbot/handler.ts` |
| One turn → one reply, pure and testable (every layer in order) | `src/chatbot/turn.ts` |
| Language bridges (Latin → Cyrillic, glued words, slang, function words) | `src/chatbot/textNorm.ts` |
| Follow-up resolution ("тэр", "эхнийх нь", numbered picks) | `src/chatbot/contextualText.ts`, `fastPathRouting.ts`, `clarificationState.ts`, `productSelectionState.ts` |
| Model adapters (JSON understanding, reply writer) and the verifier | `productUnderstandingModel.ts`, `productWriter.ts`, `productReplyVerification.ts` |
| Reply presentation rules | `chatbotReplyPolicy.ts`, `reply.ts` |
| Hand-over detection and reasons | `handoffDetection.ts`, `turn.ts` (`HandoffReason`), `pause.ts` |
| Owner FAQ matching | `knowledge.ts` |
| Model spend ledger and budget | `aiUsage.ts` + `ChatAiUsage` |
| Analytics aggregation (pure) | `analytics.ts` |
| Rate limits, signatures, admin auth, Meta delivery | `rateLimit.ts`, `webhookSecurity.ts`, `adminAccess.ts`, `metaDelivery.ts` |
| Evaluation harness and spend guard | `tests/chatbot/eval/harness.mjs`, `scripts/lib/evalGuard.mjs` |

## Commerce adapter (what a product business changes)

| Concern | Module |
| --- | --- |
| Catalogue read (products, variants, stock, published facts, shop FAQ, policies) | `src/chatbot/catalogue.ts` (reads Prisma `Product`, `ProductSize`, `ChatFaq`, `src/config/store-data.mjs`) |
| Product matching and request topics | `productSearch.ts`, `productRequest.ts` |
| Deterministic product answers (price, variants, stock, volume, usage, ingredients, FAQ) | `productAnswerPlan.ts`, `productPriceBlock.ts`, `productFacts.ts` |
| Purchase intent, checkout link, chat order draft (confirmation required) | `commerce/purchase.ts` |
| Order creation through the shop's own service | `commerce/placeOrder.ts` → `server/services/placeOrder.js` |
| Private order status lookup | `security.js` (`privateOrderStatus`) |

A different business replaces the adapter rows: an appointment business would read services and
schedules instead of products, plan availability instead of stock, and book instead of ordering.
Everything above the line stays.

## Data

- `Product.volume / howToUse / ingredientList / safetyNotes / faq`: published facts, one source for the
  product page and the assistant. Empty means "not published": the assistant says so and offers contact.
- `ChatFaq`: the owner's shop questions; the assistant quotes answers verbatim and the FAQ page shows them.
- `ChatConversation.customerName / customerPhone / notes / handoffReason / handoffAt / lastHumanAt / botReleasedAt`.
- `ChatLead.reason / context`.
- `ChatSettings.chatOrdersEnabled / handoverAutoResumeHours / aiModel / aiDailyBudgetUsd`.
- `ChatAiUsage`: daily calls, tokens and estimated cost per environment, model and caller.
- `ChatMessage.metadata.events`: `purchase_intent`, `checkout_link`, `chat_order_started`,
  `chat_order_created`, `unanswered`, `unpublished_fact:<topic>`, `shop_faq`, `safety_question`,
  `growth_question`, `not_in_catalogue` (the Activity page counts these).

## Turn order (turn.ts)

1. Payment claim → human/complaint requests.
2. Purchase layer: an active chat-order draft (variant → offer → contact → address → confirm), or
   new purchase intent ("авъя", "order it", model intent `buy`).
3. Order status (number + phone), contact capture, thanks, greetings.
4. Keyword fast paths: safety, growth, how to order, bank, delivery, payment, returns, contact, about,
   the owner's shop FAQ.
5. Product routing (named, numbered, in focus) → deterministic product answer.
6. The AI writer behind the verifier (recommendations, open questions, chit-chat).
7. Fallbacks: catalogue list, "which product?", contact line. Never silence, never a control token.

## Safety rules that never move

- Every amount, link, stock label, phone and email in a model reply is checked against the catalogue.
- No growth, timeframe, medical or safety promise; reactions get "stop, rinse, see a doctor".
- Payment is never confirmed by the assistant. Orders are created only after "тийм" on a server-priced
  summary, through the same service as checkout, as bank-transfer orders that expire unpaid in 24 hours.
- Customer text, catalogue text and owner notes are data, never instructions.
- The admin test chat and evaluation runs never create real orders or alerts.
