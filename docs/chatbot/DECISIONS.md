# Decisions

- Shared memory is prohibited by the session's repo instructions. No Obsidian vault or Claude notes were opened. Uudam source only was inspected, read-only.
- Uudam's checked-in provider and local `OPENAI_MODEL` currently use `gpt-4o-mini`, contrary to the task description. The task expressly prohibits that downgrade. Lorentz defaults to `gpt-4o`, in the same family, and never retries with a cheaper model. `OPENAI_MODEL` overrides the default.
- OpenAI understands the turn and selects evidence IDs. Customer text is rendered from database/config evidence, not model-written prose. This prevents fabricated facts and guarantees the verifier uses the same formatter as generation. Unsupported questions capture a lead and pause the conversation.
- Conversation IDs are opaque random capabilities. Public routes also require a separately generated secret token; only its SHA-256 hash is stored. No sequential IDs or public inbox exist.
- State, rate windows, event deduplication and processing leases live in Postgres. No Redis, timers, workers or self-fetch loops are introduced server-side.
- Shared store facts will live in an ESM source exported through the existing typed `src/config/store.ts` API. Delivery fee uses the same server helper as order creation.
- Untracked sizes never receive urgency. Product badges require all sizes to be tracked and low/sold out, avoiding product-wide urgency when an unlimited size exists. Exact counts are hidden unless enabled.
- Admin extra knowledge and localized copy are trusted owner input, but cannot override catalogue prices/stock, order privacy or the no-medical-claims rule.
- Human replies are explicitly administrative; the automated verifier gates bot output. Meta outgoing delivery checks kill switches immediately before network requests.
- The storefront's public delivery fee is resolved by `next.config.mjs` from the same server helper used by order creation and the bot. Only the numeric fee is bundled; changing deployment environment fees requires a rebuild.
- Source descriptions, ingredients, usage and FAQ answers are quoted verbatim. Catalogue names and variant labels are never translated or invented. The surrounding reply and stock wording use the customer's language.
- Replies longer than the shared channel budget fall back to staff, preserving complete facts and links rather than truncating them. An interrupted inbound-only turn can safely resume on retry.
- Inventory inspection found that missing/unknown sizes bypassed reservations. Order creation now rejects those variants before reserving stock. Existing products and tables were not renamed.

## Port round 2

- The replacement task supersedes round 1. Import original code byte for byte in a separate commit, then adapt in reviewable diffs. Imported routes/modules are temporarily excluded only during the import commit.
- The later task expressly requests the single Uudam reply logic map. That file alone was read as task input; no linked notes or other external/shared memory was accessed.
- Uudam source HEAD and clean status are recorded in UUDAM_IMPORT.json. Source files are copied without executing source services or connecting to its database.
- Only administrative takeover sets paused. A request for help flags needsHuman and creates one lead/alert while subsequent bot turns continue.

- Direct source inspection found product understanding's original default is gpt-4.1, while its shared reply provider defaults to gpt-4o-mini and retries some errors with that cheaper model. The no-downgrade rule takes priority: Lorentz uses gpt-4.1 by default and never retries with a cheaper model. The ignored local model override was updated to gpt-4.1 for equivalent QA.
- Colour-failure reproduction against the original engine, in a test-channel conversation deleted by exact ID: the model returned unknown with no product IDs, no exception, and the renderer marked this response verified before automatic handoff paused it. Original understanding evidence omitted FoodSize (now ProductSize) variants. The fix requires grounding product/variant matching, not only changing catch logging.
- Imported runtime timers are removed. Observability flushes through background(); request context suppresses external sinks and operational alerts for QA. Persistent webhook claims use additive leaseOwner, leaseUntil and payload fields.
- Migration 20261012010000_chatbot_port_receipts adds receipt fields and ChatErrorLog level/details only; it was applied successfully.
- The existing Express chatbot endpoints issue method-preserving redirects for cached clients. All implementations live under the Pages chatbot routes and call the same ported handler.

## Port round 2: completion decisions (Claude, 2026-10-12)

- The conversation logic is a pure `runCustomerTurn()` (turn.ts) with injected understanding, reply and order-lookup functions; `handler.ts` only persists. The same function serves the website, admin test chat, demo and Meta, and the tests run it without a database.
- The deterministic product answer stays first for prices, variants, stock, usage and discounts (Uudam's structured answer). The AI writer handles recommendations, comparisons, open questions, unknown products and chit-chat. Its output is verified, and on rejection the deterministic fallback is sent, never silence.
- The model's own "medical" label is not trusted on its own: it labelled "how often do I apply it" as medical. Growth and safety questions are matched deterministically and answered without promises.
- Untracked stock (`stock = null`) is reported as "available to order", never with a count or urgency.
- Not-yet-converted Uudam test suites are parked in `tests/chatbot/uudam-pending/` rather than deleted or left failing the build.
