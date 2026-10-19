# Application improvements — 18 October 2026

This pass extends the [UI/UX audit](UI_UX_AUDIT.md) into customer behavior,
authenticated admin workflows, API performance, authentication and commerce
correctness. Changes are local and have not been deployed. The database schema
has not changed.

## Completed changes

| Area | Result |
| --- | --- |
| Customer shopping | Cart storage rejects corrupt quantities/prices, survives restricted storage, and synchronizes across tabs. Checkout blocks duplicate submissions, focuses invalid fields and reports request failures. Product requests abort when navigation makes them obsolete. |
| Payment experience | QR/app actions disappear after expiry or cancellation. Polling pauses in hidden tabs, avoids overlapping requests, and ignores responses for another order. Late money on cancelled orders produces a manual-review notice. Invoice errors provide recovery controls. |
| Admin navigation and access | Removed duplicate auth/query providers, preserved language during login/recovery, kept public recovery pages accessible, and lazy-loaded dashboard sections. Mobile navigation, forms and order expansion support keyboard/touch operation. |
| Admin inventory | Product edits preserve zero and untracked stock. Unchanged stock is omitted from save payloads; explicit stock changes include the expected previous stock so stale edits return a conflict instead of overwriting reservations. Failed loads are distinguished from an empty store. |
| Admin operations | Order counts and filtered lists refresh after status changes. QPay cannot be manually marked paid. Revenue failures show retry states. Inbox drafts belong to individual customers; obsolete requests are cancelled and mobile list/thread navigation is explicit. Error Logs labels, notices, filters and states support MN/EN. |
| Order integrity | Checkout validates and combines item quantities, locks variant stock in a consistent order, and honors idempotency keys. Concurrent checkout cannot oversell the tested stock. Cancellation/expiry restores inventory in the same transaction as the state change. |
| Payment integrity | Payment receipt, order state and sales accounting commit together. Duplicate callbacks/checks count once; delivery states cannot move backwards. Cancelled orders retain late receipts for manual resolution. Orders with payment history cannot be deleted. |
| Product history | Ordered products cannot be deleted. Active order variants cannot be renamed/removed or switched between tracked/untracked modes. Order details use the saved total as authoritative. |
| Authentication | Normalized/validated inputs, bounded password sizes, verified Google emails, restricted JWT algorithms, server-side admin-role rechecks and separate recovery/login limits. OTP and reset consumption use conditional writes to prevent concurrent reuse. Redirects accept only safe internal paths. |
| API/runtime | Coalesced bounded catalog/settings caches, cache invalidation after writes, batched stock reads and linear category traversal. Maintenance is registered in the serverless background path. Added health/readiness endpoints, origin/proxy configuration, timeouts, controlled media upload concurrency and temporary-file cleanup. |
| Communications | Escaped email content, store branding and correct customer links. Synthetic guest addresses receive no order/status/payment emails. |
| Maintenance | Added commerce regression tests, isolated PostgreSQL transaction checks, CI application checks and current setup/deployment/security documentation. |

## Verification

| Check | Result |
| --- | --- |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm test` | 64 commerce + 62 chatbot tests passed |
| `npm run test:commerce:db` | 9 real PostgreSQL integration checks passed |
| `npm run build` | Prisma generation and Next.js production build passed |
| `git diff --check` | Passed |
| Customer browser sweep | 14 routes × MN/EN × 5 widths (320–1440px): 140 checks, no document overflow or uncaught page errors |
| Admin browser sweep | Products/orders/revenue/chatbot × MN/EN × 6 widths (320–1920px): 48 checks, no document/main overflow or uncaught page errors |
| Browser interactions | Menu focus/Escape, search/filter, cart, checkout validation, payment pending/paid/expired/failure/manual-review, stock payloads, keyboard order expansion and separate inbox drafts passed |
| Account payment regressions | Expiry, unpaid cancellation and stale responses after switching orders passed |
| Admin Error Logs | MN/EN populated, empty, API-error and unconfigured states passed; no 390px overflow, page errors or unresolved translation keys |
| Accessibility automation | Axe WCAG A/AA scans on 12 representative customer/admin-login states reported no violations |

The final browser runs used the local development server with intercepted API
fixtures and fake auth identities. They exercise rendering and client behavior,
not real OAuth, SMTP, Cloudinary or merchant settlement. Automated accessibility
scans do not cover every assistive-technology combination.

The PostgreSQL checks create a fresh temporary cluster on port 5441; they never
use the configured application database. They cover concurrent reservations,
duplicate checkout keys/payment confirmations/expiry workers, stale expiry
scans, payment-versus-expiry/cancellation races, rollback, and late-payment
history. No real payment, order or email was created for verification.

## Measured catalog reads

An isolated local Express process read the configured database through a
read-only Prisma guard, with no background jobs. Each row uses 12 samples.
Cold samples invalidate the process cache; warm samples follow the final cold
sample. Timings include HTTP response work and database network latency.

| Endpoint | Cold median / p95 | Warm median / p95 | SQL across 12 warm requests |
| --- | --- | --- | --- |
| `/food` | 843.57 / 4473.28 ms | 21.47 / 55.99 ms | 0 |
| `/category/tree` | 281.16 / 557.18 ms | 11.05 / 19.17 ms | 0 |

The first cold product sample includes connection startup. These figures show
the benefit of repeat reads from the process cache; they are not production
latency guarantees or a before/after load test. Cold database latency remains
material and should be measured from the deployment region. The benchmark
attempted no writes.

## Remaining launch and scale work

- **Live integrations:** verify QPay invoice creation, callback delivery,
  settlement and late-payment handling with the merchant's sandbox/test process.
  Provider invoice creation and the local database are not one atomic system;
  stable invoice references reduce duplication, but provider recovery still
  needs validation. Refunds require manual handling.
- **Operations:** configure real public URLs, mail/OAuth/media credentials,
  monitoring, secret rotation, backups and a tested restore procedure.
- **Multiple processes:** catalog/settings caches and commerce Express rate
  limits are process-local. Chatbot rate buckets already use PostgreSQL across
  instances. Catalog
  changes on another instance can remain stale for the cache TTL; stock is
  validated transactionally at checkout. Shared cache invalidation and a shared
  limiter store are future deployment work. Admin-role revocation can take up
  to the 15-second role-cache TTL per process.
- **Large catalogs:** catalog/review endpoints still return broad lists. A large
  business needs server-side pagination/search and load tests against its actual
  catalog and traffic.
- **Commerce records:** saved unit-price snapshots, payment timestamps, a
  reservation ledger and refund records need a deliberate schema migration.
  Current guards protect active variants and saved order totals, but cannot
  reconstruct missing historical fields.
- **Session revocation:** resetting a password does not revoke every existing
  access token. Session versioning or a shared revocation mechanism is needed
  for that guarantee.
- **Business isolation:** this remains a single-store application. Reuse it for
  separate businesses through separate deployments, databases and credentials.
  A shared multi-business installation needs tenant ownership and authorization
  boundaries throughout the schema/API.

These checks establish specific verified behaviors. They do not establish that
every feature, production dependency or future traffic level is ready.
