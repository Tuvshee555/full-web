# Codex task: REAL port of the Uudam engine into full-web (replaces round 1)

Read `docs/codex/CHATBOT_MERGE_PROMPT.md` first. All its hard rules still apply, especially: **do not
modify the Uudam repo, its DB, its Vercel project or its Meta tokens. Copy from it only.**
Don't ask questions: decide, record the decision in `docs/chatbot/DECISIONS.md`, and keep going.
This task replaces `CHATBOT_FIX_1.md`, but that file's transcripts and "never silent" rules become
acceptance tests here.

## Why

The first attempt did not port Uudam. It wrote a new 669-line bot (`server/chatbot/`) that kept only
Uudam's *ideas*. The Uudam engine is ~131 files / ~44k lines in `src/lib` plus `src/pages/api/webhook.ts`
(2,607 lines) and `demo.ts`. It was hardened on hundreds of real customer chats. A live review of the
rewrite failed all 6 multi-turn conversations: it went silent after any handoff, failed a simple colour
question, and dumped templates (details in `CHATBOT_FIX_1.md`). Uudam already solved those classes of
problem. **The owner wants Uudam's actual code, copied in, with travel removed and the shop domain put in
its place.**

Source: `C:\Dev\Nexon-nova-company\clients-chatbot\Uudam-travel-brand\uudam-travel-chatbot`
(Next pages-router + TypeScript; `src/lib`, `src/pages/api`, `src/components/admin`, `tests/`).
First read the Uudam reply logic map:
`C:\Users\ganbo\OneDrive\ドキュメント\Obsidian-Vaults\Personal-Knowledge-Base\Business\Claude-Memory\reference_uudam_bot_reply_logic_map.md`

## Method: copy → classify → strip → re-domain. Not rewrite.

**Step 1: copy verbatim, own commit.** Copy Uudam's `src/lib/**`, `src/pages/api/webhook.ts`, `demo.ts`,
the bot-related `src/pages/api/admin/*` routes, the bot-related admin components (`BotTab`, `LeadsTab`,
`SettingsTab`, `GreetingTab`, `ErrorLogsTab`, `AnalyticsTab`, `AdminShared`, conversation/inbox pieces) and
`tests/**` into full-web under `src/chatbot/` (lib), `src/pages/api/chatbot/` (routes),
`src/admin/components/chatbot/uudam/` (admin) and `tests/chatbot/`. It doesn't need to compile yet; exclude
it from tsc/lint/build for this one commit only. Commit: "Import Uudam bot engine verbatim (not wired)".
This makes every later change reviewable as a diff against the original.

**Step 2: write `docs/chatbot/PORT_MAP.md`.** List EVERY copied file (lib, api, admin, tests) with one of:
- `KEEP`: domain-free (conversation memory, clarification state, customer-turn parsing, text
  normalisation / Latin Mongolian, greeting phrases, handoff detection, pause, rate limit, webhook dedup /
  security / attachments, messenger/instagram send, outbound kill switch, OpenAI provider + fallback,
  reply policy, telemetry, error log, observability, readiness, health).
- `ADAPT`: travel-entangled but the mechanism is generic. Keep the control flow, guards, fallbacks and
  ordering, and swap the domain (see the mapping table).
- `DROP`: travel-only (posters, PDFs, weather, itineraries, hotels, age bands, passengers, seasons, Drive
  sync, website trip sync, customer documents, flow builder, trip photo import, Uudam QPay).
Every DROP gets a one-line reason. File counts must add up to the number copied. **When in doubt, ADAPT,
don't DROP.**

**Step 3: re-domain.** Mapping (extend as needed and record it in PORT_MAP):

| Uudam | Lorentz |
| --- | --- |
| trip / catalogue of trips | product (`Food`) / catalogue of products |
| trip aliases, name matching, disambiguation ("which trip?" numbered list memory) | product name matching + the same numbered-list memory ("аль нь вэ? 1) … 2) …") |
| departure date / date selection | size or colour variant (`FoodSize.label`) |
| per-date "Цөөн суудал" (ALMOST_FULL) | per-size "Дуусаж байна" via `server/utils/stockLevel.js` |
| sold out / cancelled date | stock 0 → "Дууссан" |
| fares, price groups, ONE shared fare writer + verifier | ONE product price/stock formatter + the same verifier pattern |
| trip understanding model (AI picks the trip) | product understanding model (AI picks product + variant) |
| booking collect flow (passenger details) | order help: link to product/cart/checkout; collect name + phone only for handoff |
| trip facts / FAQ / company info | `PRODUCT_CONTENT`, `STORE`, `BRAND_COPY`, admin extra knowledge |
| payment questions | QPay + bank transfer only (`src/config/store.ts` bank details); no cards |
| leads / handoff / pause / takeover | same, but **paused = admin takeover only** (see acceptance) |
| Uudam DB tables (pg/neonDb) + Redis state | full-web Prisma (reuse the existing `Chat*` tables, add tables additively if needed); Redis state → Postgres. No Redis |

Model: keep whatever model Uudam uses for understanding and replies. Don't downgrade.

**Step 4: wire it.**
- Routes are Next pages API routes under `src/pages/api/chatbot/...`, which is where Uudam's own routes
  already live. On Vercel, confirm that these specific routes win over the `src/pages/api/[[...slug]].js`
  Express catch-all. Locally `server.mjs` sends all `/api` to Express, so route `/api/chatbot/*` to Next
  BEFORE `server.use("/api", api)`. Verify both runtimes.
- The storefront widget and admin chatbot section that already exist may stay if they're good, but they must
  call the ported engine. Uudam admin features (bot settings, greeting, leads, error logs, analytics, inbox
  with takeover) go into the full-web admin Chatbot section, restyled to Lorentz (light, paper/sand/ink/
  espresso/terracotta, Cormorant headings, Onest text, radius 0).
- Messenger/Instagram: the ported Uudam webhook, disabled until `META_PAGE_ACCESS_TOKEN`,
  `META_APP_SECRET`, `META_VERIFY_TOKEN` exist (keep `docs/chatbot/META_SETUP.md` current).
- **Exactly one engine.** When the port works, delete the round-1 rewrite (`server/chatbot/handler.js`,
  `understanding.js`, `reply.js`, …) and any route that still calls it. Website, admin test chat, demo and
  Meta all go through the same ported entry point. (Uudam lesson: `/api/demo` and `/api/webhook` silently
  diverged. Make them one path.)
- Split anything over 2,000 lines (`webhook.ts` is 2,607). Split by responsibility; don't change behaviour.

**Step 5: port the tests.** Port every KEEP/ADAPT test from Uudam's `tests/` to the Lorentz domain
(fake fixtures only, no real product names or prices). Drop only tests of DROPPED files. Add
`npm run test:chatbot` covering them.

## Acceptance (all must hold)

1. **Never silent.** Every customer turn gets a reply unless an admin took over or the global switch is off.
   Handoffs set `needsHuman` + one lead + one Telegram alert; the bot keeps answering afterwards. Provider
   or verifier failure → a safe deterministic reply, never `null`, never a handoff loop.
2. The 6 transcripts in `CHATBOT_FIX_1.md` pass as multi-turn regressions, plus at least 15 more multi-turn
   scenarios (≥ 4 turns; mn Cyrillic, Latin mn, en). They must cover: colour/variant questions,
   "the first one" after a list, handoff followed by normal questions, an order complaint followed by an order
   lookup, card payment, an out-of-catalogue product, chit-chat, a medical/growth trap and a discount question.
3. 0 invented facts (every price, name, variant and stock word matches the DB/config), 0 privacy leaks,
   reply language matches the customer, English replies don't paste Mongolian description paragraphs.
4. Uudam's behaviours exist in Lorentz form: numbered "which one?" memory, follow-up resolution, Latin
   Mongolian understanding, greeting flow, human takeover, dedup, outbound kill switch.
5. `npx tsc --noEmit`, `npm run lint`, `npm run test:chatbot`, `npm run build` pass. The QA runs locally AND
   against production after deploy, and QA data is deleted by exact id. QA never triggers Telegram alerts.
6. Uudam repo: `git status` clean and HEAD unchanged at the end (report both).

## Report

Update `docs/chatbot/REPORT.md` with a "Port round 2" section: PORT_MAP totals (KEEP/ADAPT/DROP counts),
the domain mapping, what was deleted from round 1, the multi-turn QA table with the honest pass rate, the
tests ported, any remaining gaps, and commit hashes.
