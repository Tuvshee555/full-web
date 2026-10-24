# Lorentz redesign audit — 24 October 2026

## Verified catalog discrepancy

The configured database was inspected with read-only counts: 10 products, five
categories, three orders, and one chatbot settings record. The latest product
terminology and option-price migrations were already applied. The deployed
`https://full-web-lac.vercel.app/api/products` returned HTTP 200 and ten real
products; `/api/category` returned five categories and `/api/ready` was ready.
No customer data or credentials were copied into this report.

`Product` has no draft, publication or locale flag. Admin
`GET /products/admin/inventory` and public `GET /products` use the same product
query. Admin authentication controls exact inventory visibility; it does not
select a different catalog. Stock-zero products remain discoverable and cannot
be purchased through the server's stock validation.

The collection's initial HTML contains no product links because React Query
loads products after client hydration. That alone does not establish an empty
database. Local browser inspection also exposed a real configuration mismatch:
the public backend URL targeted port 3000 while this checkout ran on 3010 and a
different project occupied 3000. Local validation must use the same-origin
`/api` configuration or an explicitly correct external backend URL. No products
were exposed, invented, republished or seeded into the configured database.

## Functional changes

- The storefront now uses one restrained ivory, espresso and bronze editorial
  system across the home page, collection, product detail, cart, checkout,
  account and information routes. It retains the real catalog, prices, product
  photos and legal copy, while adding explicit delivery totals, responsive
  navigation, image fallbacks and distinct loading, service-error, empty-catalog
  and no-filter-match states.
- The admin workspace now has a persistent navigation shell and real overview
  metrics for order attention, payment, fulfillment, recognized revenue and
  inventory. Product/category editing, stock filters, order detail, revenue and
  chatbot tools use the same visual hierarchy in English and Mongolian.
- The chatbot workspace retains all seven operational tabs and adds a two-pane
  inbox, page-scoped search, attention/unread indicators, clear offline and
  empty states, transcript roles/times, draft preservation and a mobile
  conversation return flow. Analytics never invents growth percentages or
  activity when the underlying data is empty.
- Admin list and detail DTOs report independent payment states. COD dispatch
  remains unpaid until delivery; cancelled QPay orders with a verified receipt
  require review; legacy Lemon refunds remain visible as refunded.
- Recognized revenue keeps the existing paid non-COD / delivered COD rules and
  excludes cancelled orders and refunded legacy Lemon transactions. Reporting
  dates use the existing Ulaanbaatar business-day boundary.
- Order items expose nullable stored unit prices and line totals. Historical
  orders without snapshots retain a null snapshot instead of asserting that
  today's catalog price was the purchase price. Compatibility fields remain.
- A changed product price or delivery charge returns `409 PRICE_CHANGED` before
  creating an order or reserving inventory. Checkout updates its summary and
  asks the shopper to review and explicitly submit the new total. Backend prices,
  variants, quantities, stock and delivery fee remain authoritative.
- Duplicate clicks remain blocked. Retries of an identical checkout retain
  their idempotency key; changing its cart, payment or delivery payload creates
  a new attempt instead of replaying a different request.
- COD customer tracking uses fulfillment steps without a misleading completed
  payment step during delivery. Stale bank confirmation URLs redirect paid,
  cancelled and other-method orders to their authenticated order status rather
  than inviting another transfer.

## Automated verification

- Commerce controller/security/cart/payment/SEO suites: 101 passed. They include
  stale product prices, changed delivery fees and independent payment state.
- Chatbot suite: 69 passed, using isolated credentials and service doubles.
- Product terminology migration regression: three checks passed against a fresh
  temporary PostgreSQL cluster, including historical data and constraints.
- Real PostgreSQL commerce integration covers admin creation/editing appearing
  in the public catalog, exact-stock privacy, historical price snapshots,
  payment/revenue agreement, quote review, oversell prevention, duplicate
  checkout keys, atomic receipts, cancellation/expiry races and late funds; all
  12 integration checks passed.
- TypeScript checking, ESLint and the optimized Next.js production build
  completed successfully on Next.js 16.4.2.
- Desktop and 390-pixel browser passes used an isolated PostgreSQL fixture and
  covered the storefront home/catalog/search/cart/checkout states and the admin
  overview, product editor, inventory, order/payment detail, revenue, chatbot
  inbox/transcript and analytics. The deployed public API was separately checked
  read-only and returned the same ten configured products.

The isolated database scripts allocate their own temporary databases, block
external payment/notification calls and clean up only their validated temporary
directories. They do not use the configured store database.

## Verification limits

No live payment, production mutation, customer email, chatbot outbound message
or destructive database operation was performed. Provider settlement, live
merchant credentials and production admin sessions remain outside this test
scope.
