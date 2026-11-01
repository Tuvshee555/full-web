# Stock reservations from chat orders: investigation and recommendation (1 November 2026)

No policy was changed. This documents what happens today and what is proposed.

## How it works today

- A tracked size (a stock number entered in the admin) is reduced when an order is created, inside
  the same database transaction, so two orders can never sell the same last unit.
- A chat order is a bank-transfer order: it holds its units for 24 hours. A website QPay order holds
  them for 15 minutes, a website bank-transfer order also for 24 hours. These deadlines are written
  in the Terms page and a test keeps them equal to the code.
- Unpaid orders past their deadline are cancelled and their units returned by `expireUnpaidOrders`.
  On Vercel there is no cron: it runs when a request reaches the shop's `/api` adapter, at most once a
  minute per warm instance, 100 orders per payment method per run. Storefront browsing triggers it.
- **Live shop today: no size has a stock number**, so nothing is reserved and every product is
  "available to order". The risks below start the day the owner enters stock counts.

## What was reproduced (isolated PostgreSQL, invented product with 5 tracked units)

| Check | Result |
| --- | --- |
| The same "тийм" retried with the same message id | 1 order: duplicate detection returns the stored reply |
| Two "тийм" sent at the same moment | 1 order: the second gets "conversation busy" |
| Two purchases in one conversation, confirmed one after the other | 2 unpaid orders, both holding stock |
| One customer orders all remaining units | Allowed; the next customer is told the size is sold out, although nothing is paid |
| The same phone orders in chat (bank) and on the site (QPay) | 2 unpaid orders; the QPay one frees its units after 15 min, the chat one after 24 h |
| After 24 hours | The expiry job cancelled all 5 orders and returned all 5 units |

Abuse ceiling with the current rate limits: 10 new chats per hour per network address, 15 messages
a minute per chat, about 5 messages per order. One address can therefore hold stock in many orders,
for 24 hours each, without paying. The website's bank-transfer checkout has the same exposure, with
the guest-account limit as its only brake.

## Recommendation (needs approval before any change)

| # | Protection | Effect on real customers | Effort |
| --- | --- | --- | --- |
| 1 | **One unpaid chat order per conversation.** A second "авъя" while one is unpaid shows that order and its bank details, and offers to add to it or cancel it, instead of reserving again. | None for normal buyers; prevents accidental duplicates. | Small |
| 2 | **One unpaid chat order per phone number** across chats within 24 hours (a second goes to staff). | A real customer ordering twice in a day talks to staff once. | Small |
| 3 | **Quantity cap for chat orders**, for example 5 units of one size; more is handed to staff. | Bulk buyers talk to staff. | Small |
| 4 | **Stock floor for chat orders**: chat cannot reserve the last unit(s) of a size (for example keep 1), so an unpaid chat order cannot sell out a product. | The last unit can only be bought on the website. | Small |
| 5 | Shorter hold for chat bank orders (for example 6 hours) with a reminder | Changes a promise in the Terms page; tests tie the two together. | Medium; owner decision |
| 6 | An expiry trigger that does not depend on traffic (a daily Vercel cron as a backstop) | None | Small; Hobby crons run once a day |

Proposed first step: 1, 2 and 3 together, before the owner starts tracking stock. 4 if stock is
very small. Keep the 24-hour promise (5) unchanged unless the owner wants to rewrite the Terms.
