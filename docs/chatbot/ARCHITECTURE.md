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
| Model spend ledger, budget and the default-model rule | `aiUsage.ts` (`resolveAiModel`: admin choice → known env model → gpt-4.1-mini) + `ChatAiUsage` |
| Audit trail (settings, FAQ, product facts, takeovers, chat orders, expiry runs) | `server/utils/audit.js` + `ChatAuditLog`, admin `audit.ts` |
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
| Order creation through the shop's own service, with the reservation policy | `commerce/placeOrder.ts` (per-phone lock, inline expiry, cap, deadline) → `server/services/placeOrder.js` (`source`, `expiresAt`, retry after expiry) |
| Reservation policy (pure) and the customer's wording for it | `commerce/reservationPolicy.ts` |
| Reservation expiry: due-order queries, once-only claim, run record | `server/jobs/expireOrders.js`, `src/pages/api/jobs/expire-orders.ts`, `vercel.json` |
| Fact verification: which facts the assistant may quote | `productFacts.ts` (`verifiedFacts`), `catalogue.ts` (`productKnowledge`), `server/controller/products/validate-product.js` (`nextVerifiedFacts`) |
| Private order status lookup | `security.js` (`privateOrderStatus`) |

A different business replaces the adapter rows: an appointment business would read services and
schedules instead of products, plan availability instead of stock, and book instead of ordering.
Everything above the line stays.

## Data

- `Product.volume / howToUse / ingredientList / safetyNotes / storage / usageFrequency / faq`: published facts,
  one source for the product page and the assistant. `Product.verifiedFacts` ({ fact: ISO date }) says which of
  them the owner checked against the real product: the assistant quotes **only verified** facts (the product
  page shows the text either way), an empty or unverified fact is said to be "not published yet" with the
  contact line, and editing a fact's text clears its tick. The description's claims need both "description"
  and "claims" ticked before the writer may use them.
- `ChatFaq`: the owner's shop questions; the assistant quotes answers verbatim and the FAQ page shows them.
- `ChatConversation.customerName / customerPhone / notes / handoffReason / handoffAt / lastHumanAt / botReleasedAt`.
- `ChatLead.reason / context`.
- `ChatSettings.chatOrdersEnabled / handoverAutoResumeHours / aiModel / aiDailyBudgetUsd /
  chatReservationMinutes / chatMaxActiveReservationsPerPhone / chatMaxQuantityPerItem`.
- `Order.source` ("web" | "chat"), `Order.expiresAt` (when the reservation ends; null on rows from before
  2026-11-02, which fall back to the payment method's window), `Order.expiredAt` (set by the expiry job).
- `ChatAuditLog`: who changed what (actor, action, target, summarised details). `JobRun`: each expiry run.
- `ChatAiUsage`: daily calls, tokens and estimated cost per environment, model and caller.
- `ChatMessage.metadata.events`: `purchase_intent`, `checkout_link`, `chat_order_started`,
  `chat_order_created`, `unanswered`, `unpublished_fact:<topic>`, `shop_faq`, `safety_question`,
  `growth_question`, `not_in_catalogue` (the Activity page counts these).

## Turn order (turn.ts)

1. Payment claim → human/complaint requests (Cyrillic and Latin: "hun bnu", "huntei yarimaar", "ajiltantai holbogdoh", "chatbot bish hun", "baraa evdersen irsen").
2. Purchase layer: an active chat-order draft (variant → offer → contact → address → confirm), or
   new purchase intent ("авъя", "order it", model intent `buy`).
3. Order status (number + phone), contact capture, thanks, greetings.
4. Keyword fast paths: safety, growth, how to order, bank, delivery (including delivery-time and
   "can you send it to <place>" questions), payment, returns, contact, about, the owner's shop FAQ.
5. Product routing (named, numbered, in focus) → deterministic product answer. Guards around the model's
   reading: "what do you sell" is always the numbered catalogue; a word that fits several products
   answers for all of them unless the text narrows it; "how long should I use it" is a usage question
   (owner's FAQ, frequency) and never the growth refusal when a product is in play; a bare "үнэ хэд"
   with nothing in focus asks which product.
6. The AI writer behind the verifier (recommendations, open questions, chit-chat).
7. Fallbacks: catalogue list, "which product?", contact line. Never silence, never a control token.

## Safety rules that never move

- Every amount, link, stock label, phone and email in a model reply is checked against the catalogue.
- No growth, timeframe, medical or safety promise; reactions get "stop, rinse, see a doctor".
- Payment is never confirmed by the assistant. Orders are created only after "тийм"/"tiim"/"за" on a
  server-priced summary, through the same service as checkout, as bank-transfer orders that hold stock for
  the owner's reservation window (default 60 minutes), at most one unpaid per phone number and at most
  5 units of one option per chat order (both owner-configurable; website checkout is not limited).
- Customer text, catalogue text and owner notes are data, never instructions.
- The admin test chat and evaluation runs never create real orders or alerts.
