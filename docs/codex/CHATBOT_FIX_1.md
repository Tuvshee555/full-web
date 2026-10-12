# Codex task: fix the Lorentz chatbot (review round 1)

Read `docs/codex/CHATBOT_MERGE_PROMPT.md` again first. Every rule there still applies.
Don't ask questions: decide, record the decision in `docs/chatbot/DECISIONS.md`, and keep going.

## Why this round exists

The 50/50 QA only tested **single questions in fresh conversations**. A review ran 6 real-style
**multi-turn** conversations against the live site (2026-10-12), and the bot failed badly. The worst
failure was that it **goes silent**.

### Review transcripts (live, before the fix)

1. **mn:** "Сайн байна уу" → greeting ✅ · "Хөмсөг нимгэн, ургуулах юм байна уу?" → "no info, ask staff,
   leave your name + phone" · then **"Үнэ хэд вэ?", "Хэд хоногт хүргэх вэ?", "Хотын төвд хүргэлт хэд вэ",
   "За тэгвэл яаж захиалах вэ" → NO REPLY AT ALL** (4 silent turns).
2. **Latin mn:** "hömsögnii serum bgaa yu" → product card ✅ · "une ni hed ve" → same card again (ok) ·
   "hed hongiin dotor urgah ve" → handoff (acceptable wording, but it pauses the bot, see the root cause).
3. **mn:** "харандаа ямар өнгөтэй байгаа" → **"Одоогоор мэдээллийг баталгаажуулж чадсангүй…"** (the
   colours ARE in the DB as sizes: Цайвар хүрэн / Хүрэн / Хар хүрэн) · then "хар хүрэн нь байна уу",
   "2-ыг авбал хямдрах уу" → **NO REPLY**.
4. **en:** "do you have something for sparse brows?" → dumps 3 products with full Mongolian description
   paragraphs inside an English reply · "how do I use it?" → "I cannot verify…" mixed into product dumps
   + handoff · "can I pay by card?" → **NO REPLY**.
5. **mn:** "Би 2 хоногийн өмнө захиалсан ирэхгүй байна" → "leave name + phone" · then
   "захиалгын дугаар … утас …" → **NO REPLY** (the order lookup never ran).
6. **mn:** "Чамайг хэн хийсэн бэ" → "can't verify, contact staff" + lead · "нүүрний тос байгаа юу" →
   **NO REPLY**.

### Root cause (confirmed in code)

- `server/chatbot/handler.js` `saveHandoff()` sets `paused = true` on **every** handoff: explicit human
  requests, but also medical questions, unknown/off-topic questions, verification failures and provider
  errors (the `catch` block calls `saveHandoff`). After that, line ~66 returns `reply: null` for every
  later message. One awkward question = the customer is ignored for the rest of the conversation.
  This is exactly the Uudam failure class "verifier-caused silences". Silence loses sales.
- Anything the deterministic renderer can't express becomes "can't verify" + handoff, even simple
  variant/colour questions, off-topic chat and "do you sell X".
- Replies are raw template dumps (several products × full descriptions), not answers.

## Required fixes

1. **Never silent.** `paused` is set ONLY by an admin takeover in the inbox. Handoffs set `needsHuman`
   (inbox flag + one Telegram alert + one lead per conversation) but **the bot keeps answering** every later
   message. While `needsHuman` is set and no human has replied, the bot may add one short line once
   ("Манай ажилтан тантай удахгүй холбогдоно"). It never repeats that line every turn.
   Provider errors and verification failures → a safe deterministic answer if one exists, otherwise a short
   apology + contact line. Never a handoff loop, never `reply: null` (except admin takeover / global off).
2. **Find and fix the real failure behind "харандаа ямар өнгөтэй байгаа".** The `catch` block hides which
   error happened. Log the error code with the turn, reproduce it, and fix the root cause. Variant questions
   (colours, sizes, "is dark brown available") must answer from `FoodSize` + the stock helper. Two matching
   products (two pencils) → list both with their colours.
3. **Follow-ups after a list.** When the bot showed several products and the customer says "how do I use
   it?", "the first one", "1", "тэр помад", or "хар хүрэн нь", resolve against the remembered list. If it is
   still ambiguous, ask ONE short numbered question ("Аль нь вэ? 1) … 2) …"). Don't hand off.
4. **Out-of-catalogue and off-topic.** "Do you sell face cream?" → "we only sell eyebrow products" + the
   categories. "Who made you?" / chit-chat → one short friendly line + what it can help with. No lead, no
   handoff, no Telegram.
5. **Order problems.** "My order hasn't arrived" → ask for the order number + phone (don't hand off yet),
   look up the status with the existing private lookup, and explain it. Hand off only if the customer still
   complains after that, or asks for a human.
6. **Payment by card** → a clear "no; QPay or bank transfer" from config. Discounts/bundles → only what the
   DB (`oldPrice`, `discount`) or the owner's extra knowledge says; otherwise give the per-item price, say
   there's no bundle offer listed, and offer a human. Don't pause.
7. **Medical/growth questions** → one honest line (no growth/medical promise; it's a cosmetic product) +
   offer a human. The bot keeps answering afterwards.
8. **Replies must read like a shop assistant, not a database dump.**
   - Answer the question asked. One product → name, price, the asked fact, link.
     A list → max 3 lines of `name — price` + links, no full description paragraphs unless asked.
   - English replies: English sentences. Product names stay as stored. Don't paste Mongolian description
     paragraphs into English replies; offer the product link instead.
   - Recommended approach (the Uudam model): the model **drafts** the wording from an evidence block
     (DB + config only). The verifier then checks every price, number, product name, variant and stock word
     against that evidence. If the check fails, send the deterministic template for the same intent. Never
     hand off on a verification failure. Keep rule 4 of the main prompt: one formatter for price/stock.
9. **QA must be multi-turn.** Add the 6 transcripts above as regression conversations, plus at least 15 more
   multi-turn scenarios (≥ 4 turns each, mn / Latin mn / en). They must include a handoff mid-conversation
   followed by normal questions, a list followed by "the first one", and a complaint followed by an order
   lookup. Hard pass criteria: **every customer turn gets a reply** (unless an admin took over), 0 invented
   facts, 0 privacy leaks, reply language matches the customer. Run it locally AND against production after
   deploy. Update `QA_RESULTS.md` with the multi-turn table and the honest pass rate.
10. **QA hygiene.** QA conversations must never trigger Telegram alerts or leave leads or conversations
    behind. The public POST `/api/chat/conversations` currently ignores a `channel` field. Pick a safe way to
    mark QA traffic (e.g. run QA through `handleCustomerMessage()` with `channel: "test"` conversations, or a
    secret header checked server-side), and delete QA data by exact id afterwards.

## Done means

- `npx tsc --noEmit`, `npm run lint`, `npm run test:chatbot` and `npm run build` pass. Unit tests are
  added for: no-silence after a handoff, list follow-up resolution, variant/colour answers, off-topic,
  card-payment and order-complaint flows.
- Multi-turn QA ≥ 95% with the hard criteria at 100%.
- Pushed to `main`, production verified, `docs/chatbot/REPORT.md` updated with a "Review round 1" section:
  each numbered fix → what changed (file paths) → evidence.
