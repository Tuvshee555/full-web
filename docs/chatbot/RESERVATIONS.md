# Stock reservations from chat orders: policy, implementation, impact (2 November 2026)

The investigation of 1 November reproduced the risks (several unpaid chat orders per phone, a chat
order holding stock for 24 hours, expiry that depended on storefront traffic). The owner approved a
policy on 2 November; this is what was built. Nothing changes for website checkout orders.

## The policy (owner-configurable: Admin → AI Chatbot → AI settings → Orders in the chat)

| Rule | Default | Range | Where it is enforced |
| --- | --- | --- | --- |
| A chat order holds its stock for | 60 minutes | 5 to 1440 | `Order.expiresAt` is set when the order is created (`placeChatOrder`); the customer's summary and confirmation state the window |
| Unpaid chat orders one phone number may hold at a time | 1 | 1 to 10 | `placeChatOrder`, counted inside a per-phone advisory lock after that phone's expired orders are released |
| Units of one product option in one chat order | 5 | 1 to 50 | The engine (`purchase.ts`: the customer gets the website cart link for the full quantity, and staff are told) and again server-side in `placeChatOrder` |

Website checkout orders keep their own deadlines (QPay 15 minutes, bank transfer 24 hours, both
written in the Terms); they are not counted against the chat limits and are never refused by them.
The Terms page now also says that chat orders carry the deadline stated in the chat.

## What a customer sees

- Order summary: "Төлбөр: дансаар шилжүүлнэ (60 минут дотор)". Confirmation: "60 минут дотор
  төлбөр хийгээгүй бол захиалга автоматаар цуцлагдаж, нөөц чөлөөлөгдөнө."
- Second order from the same phone while the first is unpaid: the first order's number, total and
  the minutes left, the bank details again, and a note that staff can change it. The chat is flagged
  for staff (reason "order problem").
- More than 5 units: "Чатаар нэг захиалгад нэг бүтээгдэхүүнээс хамгийн ихдээ 5 ширхэг захиалж
  болно", the website cart link with the requested quantity, and the chat is flagged for staff
  (reason "bulk purchase").
- Duplicate confirmations stay idempotent (same message id → stored reply; two at once → one order).

## Expiry: how a reservation ends

Every order created from now on carries `expiresAt`; older rows fall back to their payment method's
window. `expireUnpaidOrders` claims each due order with a compare-and-set on its status, cancels it,
stamps `expiredAt` and returns the stock in the same transaction, so two overlapping runs can never
restock one order twice. It runs from four places:

1. Shop traffic: every `/api/*` request and every chat message (at most once a minute per warm
   instance) — unchanged behaviour, now also on chat traffic.
2. Inline, before a chat order: that phone's expired chat orders are released first, so a customer
   whose earlier order expired is not refused.
3. Inline, on a stock shortfall at checkout or in the chat: due orders are released once and the
   reservation is retried, so a real buyer gets a unit held by a stale reservation.
4. Scheduled: `POST /api/jobs/expire-orders` with the `CRON_SECRET` (Vercel Cron daily, plus any
   external scheduler every few minutes; see RELEASE_2026-11.md). Each run is recorded in `JobRun`
   and shown on the AI Chatbot overview ("Cleanup ran … expired N").

The schedule is **not verified in production yet**: `vercel.json` and the endpoint are in the
branch, the secret must be set and the first run checked after deployment (release checklist).

## Impact on legitimate customers

| Situation | Before | Now |
| --- | --- | --- |
| Orders in chat, pays within the hour | Order held 24 h | Same outcome; the deadline is one hour (configurable) |
| Orders in chat, pays after 70 minutes | Order still open | Order cancelled at 60 minutes, stock released; the transfer lands on a cancelled order, which the admin flags for review as today ("cancelled order received a payment") |
| Wants a second product while the first chat order is unpaid | Second reservation | Shown the first order; staff can add to it or cancel it |
| Wants 8 units | Reserved in chat for 24 h | Website cart for 8 units, staff told |
| Orders on the website while a chat order is unpaid | Allowed | Allowed |
| A stale reservation holds the last unit | Next buyer refused until a sweep ran | Next buyer's order releases it inline and succeeds |

Recommendation for the owner: keep 60 minutes unless bank transfers regularly take longer; raise
"unpaid chat orders per phone" to 2 only if real customers complain. Stock counts are still not
tracked on the live catalogue, so none of this bites until stock numbers are entered.

## Verified by

- `tests/chatbot/reservations.test.ts` (engine: cap, window text, refusal reply, settings ranges)
- `tests/commerce/expire-orders.test.mjs` (job: deadline vs legacy window, once-only restock, scoped
  sweep, deadline stamping, inline retry, cron auth)
- `scripts/test-chatbot-db.mjs` (real PostgreSQL: one unpaid order per phone, cap, website order
  unaffected, cron endpoint refuses without the secret and expires exactly once, repeated run is a
  no-op, the phone can order again, concurrent confirmations create one order, audit trail)
