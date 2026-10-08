# eyebrow

The food delivery platform as one project: customer storefront, admin dashboard and API, served by a single Node process on one port.

| URL | What | Code |
| --- | --- | --- |
| `/` → `/mn` | Customer storefront | `src/app/(customer)`, `src/components`, `src/lib`, … |
| `/admin` → `/admin/mn` | Admin dashboard (requires login) | `src/app/(admin)`, `src/admin` |
| `/api/*` | Express + Prisma backend | `server/` |

Locales: `mn` (default), `en`, `ko`.

## Run locally

```bash
npm install
cp .env.example .env.local    # then fill in secrets
npm run db:local              # optional: throwaway Postgres on :5433 instead of Neon
npm run db:migrate            # first time only
npm run dev                   # http://localhost:3000
```

Production: `npm run build && npm start`.

## Scripts

| Script | Does |
| --- | --- |
| `dev` | Combined server with hot reload |
| `build` | `prisma generate` + `next build` |
| `start` | Combined server, production mode |
| `api` | API alone (routes at the root, port `API_PORT` or 4000) |
| `db:local` | Embedded Postgres in `./.local-db` |
| `db:migrate` / `db:studio` | Prisma migrate deploy / Prisma Studio |
| `typecheck` / `lint` | `tsc --noEmit` / ESLint |

## Changes from the three separate projects

- **One server** (`server.mjs`): Express mounts the API at `/api` and hands every other request to Next.js. `NEXT_PUBLIC_BACKEND_URL` is now `<site>/api`.
- **Admin under `/admin`**: admin routes, links and the language switcher were prefixed. Admin code imports through the `@admin/*` alias; the storefront keeps `@/*`.
- **Separate admin session**: both apps used the same `localStorage` keys on one origin, so admin keys were renamed (`adminToken`, `adminEmail`, `adminUserId`, `adminUser`, and the `adminToken` cookie). Logging in to one app no longer overwrites the other.
- **One proxy** (`src/proxy.ts`) handles locale redirects for both apps plus the admin auth redirect.
- **One `.env.local`** for everything; see `.env.example`.
- Password-reset emails link to `ADMIN_URL`, or `FRONTEND_URL/admin` when it isn't set.
- External webhooks/callbacks now live under `/api`. Update the QPay callback when you deploy: `BACKEND_URL/qpay/webhook`. Payments are QPay and bank transfer only (no cards).
