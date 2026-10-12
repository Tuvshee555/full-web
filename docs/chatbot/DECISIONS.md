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
