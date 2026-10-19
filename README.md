# Lorentz storefront

A Mongolian-first retail storefront, customer accounts, admin dashboard,
product assistant and Express/Prisma API in one Next.js application.

| URL | Purpose |
| --- | --- |
| `/mn`, `/en` | Customer storefront |
| `/admin/mn`, `/admin/en` | Admin dashboard |
| `/api/*` | Express API and chatbot endpoints |
| `/api/health`, `/api/ready` | Process health and database readiness |

## Local development

```powershell
npm install
Copy-Item .env.example .env.local
# Fill in local credentials and use a strong JWT_SECRET.
npm run db:local
# In another terminal:
npm run db:migrate
npm run dev
```

`db:local` creates a persistent throwaway PostgreSQL at `localhost:5433` in
`.local-db`. Existing data is never reset automatically. For a fresh database,
run migrations before using the app. Public URLs and merchant/SMTP settings
must match the intended environment.

## Checks

```text
npm run lint
npm run typecheck
npm test
npm run test:commerce:db
npm run build
```

`npm test` runs isolated commerce and chatbot suites with fake database/service
credentials. `test:commerce:db` additionally creates a fresh temporary PostgreSQL
cluster on port 5441, tests real transaction/concurrency behavior, and cleans it
up. It never uses `.env.local`'s database and must not run against production.

On Windows, Prisma generation may report a locked engine DLL while a running
server has loaded it. Stop that server before `npm run build`. When the schema
has not changed, `npx next build` validates the application using the existing
client. Start production with `npm start` after a successful build.

GitHub Actions runs lint, types, isolated tests and a production build on pull
requests and main/master pushes. It does not deploy the application or run live
merchant transactions.

## Deploying a store

The combined Node server serves everything on one port. Vercel uses the Pages
API adapter instead, with background maintenance registered after the response.

- Set `DATABASE_URL`, `DIRECT_URL`, a strong `JWT_SECRET`, and the real public
  `FRONTEND_URL`/`CUSTOMER_URL`/`BACKEND_URL` values.
- Leave `NEXT_PUBLIC_BACKEND_URL` empty to use same-origin `/api`. A localhost
  value embedded in a production build points shoppers at their own computer.
- Configure QPay merchant credentials, invoice code and the reachable callback
  at `<BACKEND_URL>/qpay/webhook`. Test provider settlement separately.
- Configure SMTP and a verified sender, Cloudinary uploads and Google OAuth
  origins. Optional alerts require the corresponding Telegram/Meta settings.
- Set CORS origins and trusted proxy topology for a separately hosted API.
- Provision database backups, restore checks and service/error monitoring.
- Replace brand, bank, contacts, product content and business policies in
  `src/config/store-data.mjs`; set delivery pricing through `DELIVERY_FEE`.

## Reusing the project

This is a single-store foundation. A separate business should have its own
configuration, deployment, database and service credentials. The current schema
has no tenant ownership boundaries, so one running installation must not be
presented as an isolated multi-business service.

Read `UI_UX_AUDIT.md` for the visual pass and `APPLICATION_AUDIT.md` for the
application improvements, measured performance and remaining launch work.
