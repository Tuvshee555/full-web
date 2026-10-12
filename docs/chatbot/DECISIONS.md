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
