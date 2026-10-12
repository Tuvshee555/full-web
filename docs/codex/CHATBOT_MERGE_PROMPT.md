# Codex task: port the Uudam chatbot into full-web as the Lorentz shop assistant

You are working in `C:\Dev\Github-V3\full-web`. Read this whole file before writing any code.
The owner wants this done end-to-end without being asked questions. Make sensible decisions,
write them down in `docs/chatbot/DECISIONS.md`, and keep going. Claude will review your work
afterwards, so leave a clear trail (see "Final report").

---

## 1. What this is

**full-web** is "Lorentz", a live e-commerce store selling eyebrow products in Mongolia.
- Live: https://full-web-lac.vercel.app (Vercel project `full-web`, team `tuvshinsaihans-projects`).
  Push to `main` = production deploy.
- Stack: Next.js 16 (App Router) storefront + admin, an Express API in `server/` (plain JS, ESM),
  Prisma on Neon Postgres (`server/prisma/schema.prisma`).
- Locally `npm run dev` runs `server.mjs` (Next + Express on :3000).
  On Vercel, `/api/*` is served by `src/pages/api/[[...slug]].js`, which hands requests to the
  Express app (`server/app.js`). **Any new API must work in both runtimes.**
- Products are the `Food` model (legacy name from a food-delivery past; do not rename tables).
  Sizes/variants are `FoodSize` with `stock Int?` (`null` = unlimited, not tracked).
  Orders are `FoodOrder` + `OrderItem`. Order statuses: PENDING, WAITING_PAYMENT, COD_PENDING,
  PAID, DELIVERING, DELIVERED, CANCELLED. Stock logic: `server/utils/stock.js`.
- Store facts and copy live in `src/config/store.ts` (`STORE`, `BRAND_COPY`, `PRODUCT_CONTENT`,
  bank details, contact, delivery info). Delivery fee is server-side (`DELIVERY_FEE`, default 9000₮).
- Payments: **QPay and bank transfer only. No cards, ever.** QPay is the LIVE merchant
  (`merchant.qpay.mn`): every invoice is real. Never pay one.
- Languages: **Mongolian + English only.** Never add another locale.
- Existing helpers to reuse: `server/utils/telegram.js` (owner alerts), `server/utils/sendEmail.js`,
  `server/utils/background.js` (post-response work on Vercel), `server/utils/lazyJobs.js`,
  `server/utils/siteUrl.js` (`siteUrl()` / `apiUrl()`), the existing admin JWT auth middleware
  in `server/` (find it; admin = `role: "ADMIN"`).

**Uudam chatbot** is a separate, LIVE, paying client's travel chatbot:
`C:\Dev\Nexon-nova-company\clients-chatbot\Uudam-travel-brand\uudam-travel-chatbot`
(Next pages-router + TypeScript, `pg` on Neon, `ioredis`, OpenAI, Messenger/Instagram webhooks,
big admin in `src/components/admin`). It is the most battle-tested bot the owner has. It was hardened
on hundreds of real customer chats. Its engine is what we want; its travel domain is not.

## 2. The goal

Bring the Uudam bot's **engine** into full-web, strip **everything travel**, and rebuild the domain
around Lorentz products, stock and orders, with a chatbot section in the full-web admin.

Keep from Uudam (adapt, don't copy blindly):
- Understanding the customer turn (intent, follow-ups, Latin-typed Mongolian, typos).
- Conversation memory / state across turns.
- The reply **verification** idea: nothing reaches the customer that contradicts the database.
- Human handoff detection + lead capture + owner alert.
- Per-conversation pause / human takeover, global kill switch.
- Webhook hygiene for Messenger/Instagram: dedup, signature check, outbound kill switch.
- Rate limiting, error logging, observability.

Remove completely (do not port): trips, departures, dates/seasons, itineraries, hotels, train
routes, weather, route maps, posters/PDF catalogues, passenger counts, age bands/infant tiers,
price groups, booking-website trip sync, Google Drive sync, customer travel documents, flow builder,
trip photo import, everything named `travel*`, `trip*`, `departure*`, `poster*`, `itinerary*`.
Uudam's own `qpay.ts`: do not port, full-web already has QPay.

## 3. Hard rules (breaking any of these = the task failed)

1. **Do not modify the Uudam repo, its database, its Vercel project, its Meta app or page tokens.**
   Read it and copy from it only. It is a live client system.
2. **No hardcoded catalogue data.** Never write a real product name, price, size, stock number or
   discount into code, prompts, comments, seeds or tests. The bot reads products from the DB at
   request time. Unit tests use obviously fake fixtures ("Test Serum A", 1000₮); QA runs against
   the real DB catalogue.
3. **The bot never invents anything:** no products, prices, discounts, stock, ingredients, delivery
   times, or medical/growth claims ("regrows in 30 days", "100% results"). If the DB or
   `src/config/store.ts` doesn't say it, the bot says it doesn't know and offers a human.
4. **One source of truth per fact.** Lesson from Uudam: 16 different code paths wrote prices and only
   one checked them, so the bot rejected a third of its own answers. In full-web there must be exactly
   one function that formats a product's price/stock line, and the verifier checks against that same
   source.
5. **One message handler for every channel.** Lesson from Uudam: the demo endpoint and the Messenger
   webhook were two handlers that silently diverged. Website widget, admin test chat, Messenger and
   Instagram all call the same `handleCustomerMessage()`.
6. **Privacy:** order status is only revealed when the customer gives the order number AND the phone
   number on that order matches. Never list or hint at anyone else's orders, names, phones or addresses.
7. **Mongolian + English only.** Reply in the language the customer wrote in (Cyrillic or
   Latin-typed Mongolian → Mongolian Cyrillic reply).
8. **Serverless-safe:** Vercel functions run max 30s, no `setInterval`, no background workers,
   no self-fetch loops, 4.5 MB request body. Post-response work goes through `background()`.
   No Redis and no new paid services: keep state in Postgres via Prisma.
9. **Database changes are additive only** (new tables/columns). Never drop, rename or truncate existing
   tables. This Neon DB is live production with real orders.
10. **Files stay under 2,000 lines.** Split before you get close.
11. Read `node_modules/next/dist/docs/` before writing Next.js code (see `AGENTS.md`: this Next version
    has breaking changes). Note: because `src/pages/` exists, `useSearchParams/usePathname/useParams`
    are typed nullable. Always use `?.`.
12. Never print secrets in logs or output. Never commit `.env*` files.

## 4. Stock: "Дуусаж байна" (running out)

In Uudam, "Цөөн суудал" is a flag on ONE departure date, shown only beside that date, never trip-wide.
The Lorentz equivalent is per **size** (`FoodSize`), computed from real stock:

- `stock === null` → untracked → show nothing.
- `stock === 0` → "Дууссан" / "Sold out" (cannot be ordered; this should already be enforced).
- `0 < stock <= threshold` → "Дуусаж байна" / "Almost gone". Threshold is an admin setting (default 5).
- Product-level badge only when **every** tracked size is low or sold out. Never invent urgency.
- Never show the exact number unless the admin enables "show exact stock" in settings.

Build one helper (e.g. `server/utils/stockLevel.js`) used by the storefront (product page size picker,
product cards), the admin product list and the bot. Show the badge on the storefront in the existing
Lorentz design (see section 6).

## 5. What the bot must do

Data it may use (read at request time): `Food` (name, price, oldPrice, discount, images, ingredients,
category, avgRating, reviewCount), `FoodSize` + stock level, `Category`, `PRODUCT_CONTENT` (how to use,
key ingredients, FAQ per product), `STORE` / `BRAND_COPY` (delivery, payments, bank details, contact,
returns, about), and admin-written extra knowledge from bot settings.

Capabilities:
1. Answer product questions (price, sizes, availability, how to use, ingredients, which product for what).
2. Recommend only from the real catalogue; send the product page link (`siteUrl()` + locale path).
3. Explain delivery fee, payment methods (QPay, bank transfer), how to order; link to cart/checkout.
4. Order status: order number + matching phone → status in plain words (paid, on the way, delivered…).
5. Hand off to a human when asked, when the bot doesn't know, on complaints, or on payment problems:
   save a lead (name/phone/question), alert the owner on Telegram, pause the bot for that conversation.
6. Greet first-time visitors with the admin-editable greeting.
7. If `OPENAI_API_KEY` is missing or OpenAI fails: no crash and no silence. Reply with a short fallback
   (store contact from `STORE.contact`) and log the error. The widget must still render.

Use the same OpenAI model family Uudam uses (check its `env.ts` / `openaiProvider.ts`). **Do not
downgrade to a cheaper model**: Uudam measured 4o-mini at 79% vs much higher for the current one.
Model name comes from env (`OPENAI_MODEL`) with a sensible default.

## 6. Admin and widget (design)

Admin lives in `src/app/(admin)/admin/[locale]/` (route groups `(food-menu)`, `(orders)`, `(revenue)`),
messages in `src/admin/messages/{mn,en}.json`. Add a **Chatbot** section in the sidebar with:
- **Inbox:** conversation list (channel, last message, unread, needs-human flag), thread view,
  "take over / give back to bot" toggle, reply as human from the admin (widget shows it live by polling).
- **Leads:** list with status (new / contacted / done), phone, question, link to conversation.
- **Settings:** bot on/off (global kill switch), greeting text (mn + en), low-stock threshold,
  show exact stock on/off, extra knowledge text, handoff message.
- **Test chat:** talk to the bot inside admin through the same `handleCustomerMessage()`.

Admin design (must match the existing admin): light only, Lorentz palette (paper #fbf8f3, sand #efe7dd,
ink #1c1714, espresso #2a211c sidebar, terracotta #a8452f for attention), Cormorant Garamond for large
headings only, Onest for everything else, **sharp corners (radius 0)**, no heavy shadows.

Storefront widget: a small chat button + panel in the customer layout, same palette and fonts, sharp
corners, works on phones. On the mobile product page there is a sticky buy bar, so the chat button must not
cover it. Conversation id is kept in `localStorage` (wrap in try/catch). Rate-limit per IP and per
conversation. Text in mn + en via the existing message files.

## 7. Channels

- Phase A: website widget + admin test chat (must be fully working).
- Phase B: Messenger + Instagram webhook endpoints, built and tested with fake signed payloads, but
  **disabled unless** `META_PAGE_ACCESS_TOKEN`, `META_APP_SECRET`, `META_VERIFY_TOKEN` are set. The
  Facebook page doesn't exist yet. Include a short setup guide in `docs/chatbot/META_SETUP.md`.

## 8. Do it in this order. Commit + push after each phase that passes its checks.

**Phase 0: read and map (no code).**
Read the Uudam reply logic map first:
`C:\Users\ganbo\OneDrive\ドキュメント\Obsidian-Vaults\Personal-Knowledge-Base\Business\Claude-Memory\reference_uudam_bot_reply_logic_map.md`
plus Uudam's `src/lib/` (`conversation*`, `customerTurn`, `reply*`, `handoffDetection`, `pause`,
`webhook*`, `messenger`, `instagram`, `openai*`, `rateLimit`, `textNorm`/`strings`, `chatbotReplyPolicy`,
`metaOutboundKillSwitch`), `src/pages/api/webhook.ts` and `demo.ts`, and the admin `BotTab`, `LeadsTab`,
`SettingsTab`, `GreetingTab`, `ErrorLogsTab`. Write `docs/chatbot/PLAN.md`: a table of every Uudam module
you touch → keep / adapt / drop, and where it lands in full-web. Decide where the bot code lives so it runs
under BOTH `server.mjs` and the Vercel adapter (recommended: plain JS ESM under `server/chatbot/`,
routes mounted in `server/app.js` under `/chat`, admin routes under `/admin/chat` with admin auth).

**Phase 1: data + stock.**
Prisma models (additive): conversations, messages, leads, bot settings (single row), error log if needed.
Create and apply the migration (`prisma migrate`), regenerate the client. Build the stock-level helper and the
storefront "Дуусаж байна" badges.
Check: `npx tsc --noEmit`, lint, the storefront still renders, an order still goes through (see test hygiene).

**Phase 2: bot core.**
Port the engine, rebuilt on Lorentz data: catalogue context from the DB, store facts from config,
memory, handoff, lead capture, Telegram alert, verifier, OpenAI fallback, one `handleCustomerMessage()`.
Unit tests with fake fixtures for: price formatting, stock level, verifier (rejects an invented price and
an invented product), order-status privacy (wrong phone → nothing revealed), language detection.

**Phase 3: widget + chat API.**

**Phase 4: admin.** Inbox, takeover, human reply, leads, settings, test chat.

**Phase 5: Messenger/Instagram** behind env flags.

**Phase 6: QA against the real catalogue.**
Write `scripts/chatbot-qa.mjs` with at least 40 realistic customer messages (≥25 Mongolian Cyrillic,
≥5 Latin-typed Mongolian, ≥10 English): prices, sizes, "is it in stock", how to use, "which one for thin
brows", delivery, payment, bank details, order status with right and wrong phone, "I want a human",
complaints, off-topic, and a medical-claim trap ("will it regrow in 2 weeks?"). The script checks every
reply automatically: every price and product name mentioned exists in the DB and matches; stock wording
matches the stock helper; no other customer's data; correct language. Report the pass rate and fix the
failures. Target: ≥ 95% pass, 0 invented facts, 0 privacy leaks.

## 9. Testing hygiene

- QA orders use first name "Тест" and last name "Захиалга". Delete only those afterwards (and their
  items/payments), and restore any stock they reserved. Never touch other orders: they belong to real people.
- Never pay a QPay invoice. Prefer BANK payment for test orders.
- QA conversations/leads: mark them (e.g. channel `test`) and delete them after QA.
- Windows: PowerShell 5.1, and `curl` mangles inline Cyrillic. Send Mongolian test messages with Node
  `fetch` or a JSON file, not inline curl.
- Run checks before every push: `npx tsc --noEmit`, `npm run lint`, unit tests, and a local run.
  The Vercel build must stay green. After pushing, confirm the live site still serves `/mn` and `/api/food`.

## 10. Env

New env needed: `OPENAI_API_KEY` (the owner provides it; put a placeholder line in `.env.example`, never
a real key), optional `OPENAI_MODEL`, and later the three `META_*` vars. If the owner has put
`OPENAI_API_KEY` in `.env.local`, you may add it to Vercel production with the Vercel CLI
(`vercel env add OPENAI_API_KEY production --sensitive --scope tuvshinsaihans-projects`, value via
stdin), then redeploy. Never print it.

## 11. Final report

When done, write `docs/chatbot/REPORT.md` with:
- What was ported, what was dropped, and where everything lives (file paths).
- The DB migration name and the new tables.
- The QA results table (message, reply, pass/fail, reason) and the final pass rate.
- Env vars needed and which ones are still missing.
- Known gaps, risks and anything you decided without asking (link `DECISIONS.md`).
- Commit hashes per phase.

Commit messages: short and descriptive. Stage only files you changed for this task.
