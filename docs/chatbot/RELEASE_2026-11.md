# Release preparation: chatbot-intelligence → production (prepared 2 November 2026)

Status: **not merged, not pushed, not deployed.** Deployment is a separate decision by the owner.
Branch `chatbot-intelligence` (local), base `main` = `origin/main` = `3a620be`.

## What production gains

- The chat assistant: Latin-script Mongolian, verified product facts only, purchase flow with
  chat orders, human hand-over with reasons, model budget, gpt-4.1-mini as the default model.
- Reservation policy for chat orders (60 minutes, one unpaid per phone, 5 units per option),
  per-order deadlines and a scheduled, recorded expiry job.
- Product fact verification (per fact, per product) and an audit trail.
- Admin: the "AI Chatbot" section (overview, conversations, knowledge, AI settings, analytics and
  costs, activity, try it, problems log).

## Database migration (additive, no data loss)

`server/prisma/migrations/20261102090000_chat_reservations_verification_audit/migration.sql`, run by
`npm run vercel-build` (`prisma migrate deploy`) on the production build, as every migration since October:

| Table | Change | Existing rows |
| --- | --- | --- |
| ChatSettings | `aiModel` default `gpt-4.1-mini`; rows with `''` updated to it. New `chatReservationMinutes` 60, `chatMaxActiveReservationsPerPhone` 1, `chatMaxQuantityPerItem` 5 | Defaults apply |
| Order | `source` ('web'; the assistant's earlier orders are marked 'chat' by their note), `expiresAt`, `expiredAt`, two indexes | Null deadline → the payment method's window keeps applying |
| Product | `storage`, `usageFrequency`, `verifiedFacts` (`{}`) | Every fact starts **unverified**: the assistant stops quoting usage/ingredient/volume/safety text until the owner ticks it (the live catalogue has none of these filled in, so nothing a customer sees today changes) |
| ChatAuditLog, JobRun | New tables | — |

Rollback: redeploy the previous Vercel deployment. The schema is additive, so the old code runs
unchanged against the new columns; the only durable change is `ChatSettings.aiModel`, which the
old code also honours (it is on its allow-list).

## Environment variables (Vercel → Project → Settings → Environment Variables)

| Variable | Action | Why |
| --- | --- | --- |
| `CRON_SECRET` | **Add** (at least 16 random characters; `openssl rand -hex 24`) | Vercel Cron sends it as `Authorization: Bearer …` on its own; the endpoint refuses every call without it in production |
| `OPENAI_MODEL` | Set to `gpt-4.1-mini` or remove it | The stored admin setting already names gpt-4.1-mini; the env value is only the fallback when the admin chooses "server default" |
| `OPENAI_API_KEY`, `DATABASE_URL`, `DIRECT_URL` and the rest | Unchanged | — |

Nothing in the branch reads a new secret apart from `CRON_SECRET`. No key is sent to the browser.

## Scheduled expiry: what is configured and what must still be done

1. `vercel.json` schedules `POST /api/jobs/expire-orders` daily at 20:00 UTC (04:00 Ulaanbaatar).
   Vercel's Hobby plan allows cron jobs no more often than once a day, so this is a backstop only.
2. For minute-level cleanup without a plan upgrade, add a free external scheduler (for example
   cron-job.org, every 5 minutes):
   - URL: `https://full-web-lac.vercel.app/api/jobs/expire-orders`
   - Method: POST (GET also works)
   - Header: `x-cron-secret: <the CRON_SECRET value>`
   - Expected response: `{"ok":true,"job":"expire-orders","expired":N,...}`; 401 means the header or the secret is wrong.
3. Verify after the first deploy: open Admin → AI Chatbot → Overview; "Cleanup ran" must show the last
   run with its trigger ("cron"). Or call the endpoint once by hand with `?trigger=manual`.

Until step 3 is done, treat scheduled cleanup as **configured but unverified**. Shop traffic and the
inline sweeps keep working regardless (they are what ran before, plus the chat-traffic trigger).

## Pre-deploy checklist (all done on the branch on 2 November 2026)

| Check | Result |
| --- | --- |
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 problems |
| `npm run test:chatbot` | 105/105 |
| `npm run test:commerce` | 115/115 |
| `npm run test:chatbot:db` (isolated PostgreSQL) | see REPORT_2026-11-02.md |
| `npm run eval:chatbot` (296 turns, no model) | 296/296, hard rules 296/296 |
| `npm run eval:chatbot -- --set heldout` (84 held-out turns, no model) | 81/84, hard rules 84/84 |
| `npm run build` | see REPORT_2026-11-02.md |
| Secrets in the diff | none (`.env*` untouched; scanned) |

## Post-deploy checks (owner or developer, 10 minutes)

1. Admin → AI Chatbot → Overview loads; the model card says gpt-4.1-mini.
2. AI settings → the three reservation fields show 60 / 1 / 5; save once to confirm writes work.
3. Knowledge → every product shows "Unverified" or "Missing" for its facts (expected: nothing is verified yet).
4. Try it → "hun bnu" hands over; "ymar buteegdehuun zardag ve" lists numbered products; "hed hongiin dotor irhe ve" gives delivery days.
5. Place one real chat order with a real phone, check the summary says 60 минут, then cancel it in Orders (stock unaffected: no stock is tracked yet).
6. Cleanup: the Overview shows a cron run within a day, or the manual call returns `ok: true`.

## Remaining owner decisions (not blocking the deploy)

- Verify product facts (Admin → Products → product → Verification), see OWNER_CHECKLIST.md.
- Whether to connect the external scheduler (recommended) or rely on daily cron plus traffic.
- Whether a reservation window other than 60 minutes suits how customers pay.
